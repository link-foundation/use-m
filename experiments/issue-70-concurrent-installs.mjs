#!/usr/bin/env node
// Reproduction for https://github.com/link-foundation/use-m/issues/70 against a
// real npm registry: N processes ask for the same package at the same moment
// into one empty npm prefix, which is what a cold `use()` wave looks like.
//
//   node experiments/issue-70-concurrent-installs.mjs
//   node experiments/issue-70-concurrent-installs.mjs --package yargs@17.7.2 --processes 8
//
// Point `--use` at another copy of the resolver to compare releases, for
// example an 8.14.x checkout:
//
//   git stash && node experiments/issue-70-concurrent-installs.mjs; git stash pop
//
// Before the fix the run reports failed workers (`ENOTEMPTY`, `ERR_MODULE_NOT_FOUND`,
// `Cannot find module`, or a truncated entry point) and one alias directory that
// several npm runs extracted on top of each other. After it every worker
// succeeds and exactly one `npm install` writes the alias.

import { execFile } from 'node:child_process'
import { mkdtemp, readdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { promisify } from 'node:util'
import { pathToFileURL } from 'node:url'

const execFileAsync = promisify(execFile)

const readOption = (name, fallback) => {
  const index = process.argv.indexOf(`--${name}`)
  return index === -1 ? fallback : process.argv[index + 1]
}

const packageSpecifier = readOption('package', 'lodash@4.17.21')
const processes = Number(readOption('processes', '6'))
const useModuleUrl = pathToFileURL(path.resolve(readOption('use', 'src/use.mjs'))).href
const keepPrefix = process.argv.includes('--keep-prefix')

const prefix = await mkdtemp(path.join(tmpdir(), 'use-m-issue-70-'))
const globalRoot = path.join(prefix, 'lib', 'node_modules')
const env = { ...process.env, npm_config_prefix: prefix, NPM_CONFIG_PREFIX: prefix }

const worker = `
  import { createRequire } from 'node:module';
  import { pathToFileURL } from 'node:url';
  const require = createRequire(import.meta.url);
  const { resolvers } = await import(${JSON.stringify(useModuleUrl)});
  const entryPath = await resolvers.npm(${JSON.stringify(packageSpecifier)}, require.resolve, { env: process.env });
  await import(pathToFileURL(entryPath).href);
  process.stdout.write(entryPath);
`

console.log(`npm prefix : ${prefix}`)
console.log(`resolver   : ${useModuleUrl}`)
console.log(`package    : ${packageSpecifier}`)
console.log(`processes  : ${processes}`)

const startedAt = Date.now()
const results = await Promise.all(Array.from({ length: processes }, async (unused, index) => {
  try {
    const { stdout } = await execFileAsync(
      process.execPath,
      ['--input-type=module', '--eval', worker],
      { env, maxBuffer: 16 * 1024 * 1024 }
    )
    return { index, ok: true, entryPath: stdout.trim() }
  } catch (error) {
    return { index, ok: false, reason: (error.stderr || error.message).trim().split('\n').slice(0, 4).join('\n') }
  }
}))
const elapsedMs = Date.now() - startedAt

const failed = results.filter(result => !result.ok)
const aliases = await readdir(globalRoot).catch(() => [])

console.log(`\nelapsed    : ${elapsedMs} ms`)
console.log(`succeeded  : ${results.length - failed.length}/${results.length}`)
console.log(`aliases    : ${aliases.filter(entry => !entry.startsWith('.')).join(', ') || '(none)'}`)
for (const failure of failed) {
  console.log(`\nworker ${failure.index} failed:\n${failure.reason}`)
}

if (keepPrefix) {
  console.log(`\nkept ${prefix}`)
} else {
  await rm(prefix, { recursive: true, force: true })
}

process.exitCode = failed.length === 0 ? 0 : 1
