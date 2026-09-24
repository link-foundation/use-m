#!/usr/bin/env node
// Issue #76: shows that Bun ignores a test timeout in bunfig.toml and only
// honours `bun test --timeout`. Creates a throwaway project with one 7 s test
// and runs it three ways; only the flag lets it pass.
//
//   node experiments/issue-76-bunfig-timeout.mjs
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bunfig-timeout-'))
fs.writeFileSync(
  path.join(dir, 'slow.test.js'),
  "import { test, expect } from 'bun:test'\n" +
    "test('takes 7 s', async () => { await new Promise((r) => setTimeout(r, 7000)); expect(1).toBe(1) })\n"
)

const cases = [
  { label: 'bunfig.toml timeout = "30000ms"', bunfig: '[test]\ntimeout = "30000ms"\n', args: [] },
  { label: 'bunfig.toml timeout = 30000', bunfig: '[test]\ntimeout = 30000\n', args: [] },
  { label: 'bun test --timeout 30000', bunfig: null, args: ['--timeout', '30000'] }
]

for (const { label, bunfig, args } of cases) {
  const bunfigPath = path.join(dir, 'bunfig.toml')
  if (bunfig) fs.writeFileSync(bunfigPath, bunfig)
  else fs.rmSync(bunfigPath, { force: true })

  const result = spawnSync('bun', ['test', ...args], { cwd: dir, encoding: 'utf8' })
  const output = `${result.stdout}${result.stderr}`
  const timedOut = output.match(/timed out after \d+ms/)?.[0]
  console.log(`${label}: ${result.status === 0 ? 'passed' : `failed (${timedOut ?? 'see output'})`}`)
}

fs.rmSync(dir, { recursive: true, force: true })
