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
    expect(publishJob.includes('git rev-parse "$TAG"')).toBe(true)
    expect(publishJob.includes('gh release view "$TAG"')).toBe(true)
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

    expect(testJob.includes('os: [ubuntu-latest, macos-latest, windows-latest]')).toBe(true)
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
    expect(workflowText.includes("matrix.runtime == 'node' && matrix.os == 'ubuntu-latest'")).toBe(true)
  })

  test('uses current action versions and explicit job timeouts', () => {
    const workflowText = readText(releaseWorkflowPath)
    const jobs = jobBlocks(workflowText)

    expect(workflowText.includes('actions/checkout@v6')).toBe(true)
    expect(workflowText.includes('actions/setup-node@v6')).toBe(true)
    expect(workflowText.includes('denoland/setup-deno@v2')).toBe(true)
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
})
