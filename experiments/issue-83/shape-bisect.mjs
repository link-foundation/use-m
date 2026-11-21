#!/usr/bin/env node
// Prints the shape `use()` returns for commonly loaded packages.
// Usage:
//   node experiments/issue-83/shape-bisect.mjs 8.16.2   # published loader from unpkg
//   node experiments/issue-83/shape-bisect.mjs local    # this checkout's use.js
import { readFile } from 'node:fs/promises'

const version = process.argv[2] || 'local'
const source = version === 'local'
  ? await readFile(new URL('../../use.js', import.meta.url), 'utf8')
  : await (await fetch(`https://unpkg.com/use-m@${version}/use.js`)).text()
const { use } = eval(source)

const specifiers = process.argv.slice(3).length ? process.argv.slice(3) : [
  'yargs@17.7.2',
  'yargs@17.7.2/helpers',
  'yargs@18.0.0',
  'simple-git@3.28.0',
  'fs-extra@11.3.0',
  'semver@7.7.2',
  '@octokit/rest@21.1.1',
  'ink@5.2.1',
  'ink@5.2.1/build/index.js',
]

const describe = (value) => {
  if (value === null || value === undefined) return String(value)
  const type = typeof value
  const tag = Object.prototype.toString.call(value)
  const keys = (type === 'object' || type === 'function') ? Object.keys(value).slice(0, 6) : []
  return `${type}${tag === '[object Module]' ? ' (namespace)' : ''} keys=[${keys.join(',')}${keys.length === 6 ? ',…' : ''}]`
}

console.log(`use-m: ${version}`)
for (const specifier of specifiers) {
  try {
    const value = await use(specifier)
    console.log(`  OK   ${specifier.padEnd(28)} value: ${describe(value)} | .default: ${describe(value?.default)}`)
  } catch (error) {
    console.log(`  FAIL ${specifier.padEnd(28)} ${error.message.split('\n')[0]}`)
  }
}
