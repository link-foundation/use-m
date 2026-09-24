import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, test } from '../src/test-adapter.mjs'

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const workflowDir = path.join(rootDir, '.github', 'workflows')
const releaseWorkflowPath = path.join(workflowDir, 'release.yml')

function readText(filePath) {
  return fs.readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n')
}

function workflowFiles() {
  return fs
    .readdirSync(workflowDir)
    .filter((fileName) => fileName.endsWith('.yml') || fileName.endsWith('.yaml'))
    .sort()
}

function jobBlocks(workflowText) {
  const blocks = new Map()
  let currentJob = null
  let currentLines = []
  let inJobs = false

  function flushCurrentJob() {
    if (currentJob) {
      blocks.set(currentJob, currentLines.join('\n'))
    }
  }

  for (const line of workflowText.split('\n')) {
    if (line === 'jobs:') {
      inJobs = true
      continue
    }

    if (!inJobs) {
      continue
    }

    const jobMatch = line.match(/^  ([A-Za-z0-9_-]+):\s*$/)
    if (jobMatch) {
      flushCurrentJob()
      currentJob = jobMatch[1]
      currentLines = [line]
    } else if (currentJob) {
      currentLines.push(line)
    }
  }

  flushCurrentJob()
  return blocks
}

describe('release workflow policy', () => {
  test('uses npm package metadata that matches registry and trusted publishing expectations', () => {
    const packageJson = JSON.parse(readText(path.join(rootDir, 'package.json')))

    expect(packageJson.license).toBe('Unlicense')
    expect(packageJson.repository.url).toBe('git+https://github.com/link-foundation/use-m.git')
    expect(packageJson.bin.use).toBe('src/cli.mjs')
  })

  test('keeps CI and publishing in the trusted-publisher release workflow', () => {
    expect(workflowFiles()).toEqual(['release.yml'])
    expect(fs.existsSync(releaseWorkflowPath)).toBe(true)
  })

  test('publishes with npm trusted publishing instead of token auth', () => {
    const workflowText = readText(releaseWorkflowPath)

    expect(workflowText.includes('id-token: write')).toBe(true)
    expect(workflowText.includes('npm publish --access public --provenance')).toBe(true)
    expect(/NODE_AUTH_TOKEN|NPM_TOKEN|secrets\.NPM_TOKEN/.test(workflowText)).toBe(false)
    expect(workflowText.includes('uses: ./.github/workflows/test.yml')).toBe(false)
  })

  test('runs tests before publishing and preserves main-branch release runs', () => {
    const workflowText = readText(releaseWorkflowPath)
    const jobs = jobBlocks(workflowText)
    const publishJob = jobs.get('publish') || ''

    expect(workflowText.includes("cancel-in-progress: ${{ github.ref != 'refs/heads/main' }}")).toBe(true)
    expect(jobs.has('test')).toBe(true)
    expect(jobs.has('publish')).toBe(true)
    expect(publishJob.includes('needs: [test]')).toBe(true)
    expect(publishJob.includes("github.ref == 'refs/heads/main'")).toBe(true)
    expect(publishJob.includes("needs.test.result == 'success'")).toBe(true)
  })

  test('fails release runs when the package, tag, and GitHub release already exist', () => {
    const workflowText = readText(releaseWorkflowPath)
    const jobs = jobBlocks(workflowText)
    const publishJob = jobs.get('publish') || ''

    expect(publishJob.includes('already exists on npm; skipping npm publish.')).toBe(false)
    expect(publishJob.includes('fetch-depth: 0')).toBe(true)
    expect(publishJob.includes('run: node scripts/npm-release.mjs status')).toBe(true)
    expect(publishJob.includes('if [ "$TAG_EXISTS" = "true" ] && [ "$RELEASE_EXISTS" = "true" ]; then')).toBe(true)
    expect(publishJob.includes('::error::')).toBe(true)
    expect(publishJob.includes('already exist. Update package.json to the next unpublished version')).toBe(true)
    expect(publishJob.includes('release metadata is incomplete; skipping npm publish and repairing tag/release.')).toBe(true)
    expect(publishJob.includes('exit 1')).toBe(true)
  })

  test('runs the Node.js test job on every Node.js line the library supports', () => {
    const workflowText = readText(releaseWorkflowPath)
    const jobs = jobBlocks(workflowText)
    const testJob = jobs.get('test') || ''

    // The set of built-in modules comes from the runtime instead of a table
    // inside use-m, so each runtime's own answer is part of the contract and
    // every Node.js line has to run the suite.
    expect(testJob.includes('node-version: [20.x, 22.x, 24.x]')).toBe(true)

    // Bun and Deno run the tests with their own runtime, so they are pinned to
    // a single Node.js instead of multiplying the matrix.
    for (const runtime of ['bun', 'deno']) {
      for (const version of ['22.x', '24.x']) {
        expect(testJob.includes(`- runtime: ${runtime}\n            node-version: ${version}`)).toBe(true)
      }
    }

    // Bun and Deno themselves are always taken from their latest release line.
    expect(workflowText.includes('bun-version: latest')).toBe(true)
    expect(workflowText.includes('deno-version: v2.x')).toBe(true)
  })

  test('covers every supported operating system and the missing-fetch shebang path', () => {
    const workflowText = readText(releaseWorkflowPath)
    const jobs = jobBlocks(workflowText)
    const testJob = jobs.get('test') || ''
    const packageJson = JSON.parse(readText(path.join(rootDir, 'package.json')))

    expect(testJob.includes('os: [ubuntu-24.04, macos-latest, windows-latest]')).toBe(true)
    expect(testJob.includes('name: Verify missing fetch through the shebang')).toBe(true)
    expect(testJob.includes('shell: bash')).toBe(true)
    expect(testJob.includes('./experiments/test-polyfill-no-fetch.mjs')).toBe(true)
    expect(packageJson.scripts.test).toBe(
      'node --experimental-vm-modules --disable-warning=ExperimentalWarning --disable-warning=DEP0025 --disable-warning=DEP0040 --disable-warning=DEP0125 ./node_modules/jest/bin/jest.js'
    )
  })

  test('keeps dependency install logs quiet while auditing shipped dependencies', () => {
    const workflowText = readText(releaseWorkflowPath)

    expect(workflowText.match(/npm ci --no-audit --no-fund/g)).toHaveLength(2)
    expect(workflowText.includes('npm audit --omit=dev')).toBe(true)
    expect(workflowText.includes("matrix.runtime == 'node' && matrix.os == 'ubuntu-24.04'")).toBe(true)
  })

  test('uses current action versions and explicit job timeouts', () => {
    const workflowText = readText(releaseWorkflowPath)
    const jobs = jobBlocks(workflowText)

    expect(workflowText.includes('actions/checkout@v6')).toBe(true)
    expect(workflowText.includes('actions/setup-node@v6')).toBe(true)
    expect(/denoland\/setup-deno@[0-9a-f]{40} # v2\./.test(workflowText)).toBe(true)
    expect(/oven-sh\/setup-bun@[0-9a-f]{40} # v2\./.test(workflowText)).toBe(true)
    expect(/actions\/checkout@v4|actions\/setup-node@v4|actions\/upload-artifact@v4|denoland\/setup-deno@v1/.test(workflowText)).toBe(false)

    for (const [, jobText] of jobs) {
      expect(/\n    timeout-minutes: \d+/.test(jobText)).toBe(true)
    }
  })

  test('retries Deno network-import tests without hiding persistent failures', () => {
    const workflowText = readText(releaseWorkflowPath)

    expect(
      workflowText.includes(
        "- name: Run Deno tests\n        if: matrix.runtime == 'deno'\n        shell: bash\n        run: |"
      )
    ).toBe(true)
    expect(workflowText.includes('for attempt in 1 2 3; do')).toBe(true)
    expect(workflowText.includes('Deno tests failed on attempt ${attempt}/3')).toBe(true)
    expect(workflowText.includes('if [ "$attempt" = "3" ]; then')).toBe(true)
    expect(workflowText.includes('exit "$status"')).toBe(true)
  })

  test('keeps npm publication delays from skipping the tag and GitHub release', () => {
    // Issue #76: npm served 8.16.1 and 8.16.2 minutes after `npm publish`,
    // the old 100-second check failed first, and neither got a tag or release.
    const publishJob = jobBlocks(readText(releaseWorkflowPath)).get('publish') || ''
    const steps = [
      'npm publish --access public --provenance',
      'node scripts/npm-release.mjs wait --timeout-seconds 900',
      'node scripts/npm-release.mjs release --target "$GITHUB_SHA"',
      'node scripts/npm-release.mjs backfill'
    ].map((step) => publishJob.indexOf(step))

    expect(steps.every((index) => index > 0)).toBe(true)
    expect([...steps].sort((a, b) => a - b)).toEqual(steps)
    expect(publishJob.includes('sleep 10')).toBe(false)
    expect(publishJob.includes('npm view')).toBe(false)
  })

  test('uses the bundled npm for trusted publishing instead of an ad-hoc install', () => {
    const workflowText = readText(releaseWorkflowPath)

    expect(workflowText.includes('npm install -g')).toBe(false)
    expect(workflowText.includes('it needs 11.5.1 or newer.')).toBe(true)
  })

  test('checks the package version on pull requests instead of after the merge', () => {
    const versionCheckJob = jobBlocks(readText(releaseWorkflowPath)).get('version-check') || ''

    expect(versionCheckJob.includes("if: github.event_name == 'pull_request'")).toBe(true)
    expect(versionCheckJob.includes('node scripts/npm-release.mjs check-unpublished')).toBe(true)
  })

  test('names Bun and Deno jobs without the Node.js version they do not test', () => {
    const testJob = jobBlocks(readText(releaseWorkflowPath)).get('test') || ''

    expect(testJob.includes(
      "name: Test on ${{ matrix.runtime == 'node' && format('Node.js {0}', matrix.node-version) || matrix.runtime }} (${{ matrix.os }})"
    )).toBe(true)
  })

  test('avoids runner, Git and credential warnings in every job', () => {
    const workflowText = readText(releaseWorkflowPath)

    // ubuntu-latest printed a migration notice on every job (issue #76).
    expect(workflowText.includes('ubuntu-latest')).toBe(false)
    // actions/checkout otherwise prints Git's "master" default-branch hint.
    expect(workflowText.includes("env:\n  GIT_CONFIG_COUNT: '1'\n  GIT_CONFIG_KEY_0: init.defaultBranch\n  GIT_CONFIG_VALUE_0: main\n")).toBe(true)
    // No job pushes with git, so no checkout leaves a token in .git/config.
    const checkouts = workflowText.match(/uses: actions\/checkout@v6\n        with:\n(?:          .*\n)*?          persist-credentials: false\n/g) || []
    expect(checkouts).toHaveLength(workflowText.match(/uses: actions\/checkout@/g).length)
  })

  test('lints workflows and pins every third-party action to an immutable reference', () => {
    const workflowText = readText(releaseWorkflowPath)
    const workflowLintJob = jobBlocks(workflowText).get('workflow-lint') || ''
    const references = [...workflowText.matchAll(/uses: (\S+)/g)].map((match) => match[1])

    expect(workflowLintJob.includes('docker://rhysd/actionlint@sha256:')).toBe(true)
    expect(workflowLintJob.includes('zizmorcore/zizmor-action@')).toBe(true)
    expect(workflowLintJob.includes('config: .github/zizmor.yml')).toBe(true)
    expect(fs.existsSync(path.join(rootDir, '.github', 'zizmor.yml'))).toBe(true)
    for (const reference of references) {
      const trusted = /^(actions|zizmorcore)\//.test(reference)
      const pinned = /@[0-9a-f]{40}$/.test(reference) || /@sha256:[0-9a-f]{64}$/.test(reference)
      expect(`${reference}: ${trusted || pinned}`).toBe(`${reference}: true`)
    }
  })

  test('reports failed or timed-out jobs through one pipeline status', () => {
    const jobs = jobBlocks(readText(releaseWorkflowPath))
    const statusJob = jobs.get('pipeline-status') || ''
    const otherJobs = [...jobs.keys()].filter((name) => name !== 'pipeline-status')

    expect(statusJob.includes("if: '!cancelled()'")).toBe(true)
    expect(statusJob.includes(`needs: [${otherJobs.join(', ')}]`)).toBe(true)
    expect(statusJob.includes('select(.value.result == "failure" or .value.result == "cancelled")')).toBe(true)
  })
})
