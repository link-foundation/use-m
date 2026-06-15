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

    expect(workflowText.includes('for attempt in 1 2 3; do')).toBe(true)
    expect(workflowText.includes('Deno tests failed on attempt ${attempt}/3')).toBe(true)
    expect(workflowText.includes('if [ "$attempt" = "3" ]; then')).toBe(true)
    expect(workflowText.includes('exit "$status"')).toBe(true)
  })
})
