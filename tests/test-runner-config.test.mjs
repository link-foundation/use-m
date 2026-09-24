import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { describe, expect, test } from '../src/test-adapter.mjs'

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

function readText(fileName) {
  return fs.readFileSync(path.join(rootDir, fileName), 'utf8').replace(/\r\n/g, '\n')
}

function bunCommandTimeoutMs() {
  const match = readText('.github/workflows/release.yml').match(/^\s*run: bun test --timeout (\d+)$/m)
  return match ? Number(match[1]) : null
}

describe('test runner configuration', () => {
  test('gives Jest and Bun the same per-test budget for real registry installs', async () => {
    // Issue #76: lodash.test.mjs installs lodash from the npm registry. On
    // windows-latest + Node.js 20 that took longer than Jest's 5 s default, so
    // a healthy install was reported as a failure.
    const { default: jestConfig } = await import(pathToFileURL(path.join(rootDir, 'jest.config.js')).href)

    expect(jestConfig.testTimeout).toBe(30000)
    expect(bunCommandTimeoutMs()).toBe(jestConfig.testTimeout)
  })

  test('does not configure the Bun timeout where Bun ignores it', () => {
    // bunfig.toml has no test timeout setting: Bun 1.4 silently ignored
    // `timeout = "30000ms"` and kept its 5 s default (reproduce with
    // experiments/issue-76-bunfig-timeout.mjs). Only `bun test --timeout` works.
    expect(readText('bunfig.toml')).not.toMatch(/^\s*timeout\s*=/m)
  })

  test('approves the install scripts of the dev dependencies that need them', () => {
    // npm 11 warns about unapproved install scripts on every `npm ci`, and
    // npm 12 blocks them: puppeteer would then have no browser to drive.
    const packageJson = JSON.parse(readText('package.json'))

    expect(packageJson.allowScripts).toEqual({ esbuild: true, puppeteer: true })
  })

  test('keeps the documented experimental VM modules flag without printing expected warnings', () => {
    // Jest needs --experimental-vm-modules for native ESM; the matching
    // ExperimentalWarning is expected and only buried real warnings in logs.
    // tests/dynamic-builtins.test.* loads every built-in, including the
    // deprecated sys (DEP0025), punycode (DEP0040) and _stream_wrap (DEP0125).
    // Jest runs tests against a copy of `process`, so the test cannot capture
    // those warnings itself; they are disabled by code, nothing broader.
    const packageJson = JSON.parse(readText('package.json'))

    expect(packageJson.scripts.test).toBe(
      'node --experimental-vm-modules --disable-warning=ExperimentalWarning --disable-warning=DEP0025 --disable-warning=DEP0040 --disable-warning=DEP0125 ./node_modules/jest/bin/jest.js'
    )
  })
})
