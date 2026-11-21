import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { describe, test, expect } from '../src/test-adapter.mjs'

// Locks the shape contract for packages commonly loaded through use-m
// (issue #83). Version 8.16.3 changed what `use()` returned for yargs,
// simple-git and others, and rejected unexported physical subpaths such as
// `ink/build/index.js`, which broke callers in a patch release. Each package
// below asserts every access pattern callers rely on, so a later change to
// module unwrapping or package resolution fails here first.
//
// The probe runs in a fresh process: Jest's VM-module importer does not
// reproduce Node's CommonJS interop namespace, and that namespace decides the
// shape. Deno loads npm packages through CDN resolvers, so it is skipped.

const moduleName = `[${import.meta.url.split('.').pop()} module]`
const probePath = fileURLToPath(new URL('./fixtures/module-shape/probe.mjs', import.meta.url))
const isDeno = typeof Deno !== 'undefined'
const isBun = typeof Bun !== 'undefined'

// Real npm installs on a cold cache can take minutes on Windows runners.
const timeout = 300000

const functions = ['function', 'function']
const expected = {
  'yargs@17.7.2': {
    direct: 1,
    // yargs@17's `.default` is yargs' own chainable `default()` method, as it
    // was in use-m 8.16.2; destructuring it still yields a callable yargs.
    destructuredDefault: 'function',
  },
  'yargs@18.0.0': { direct: 1, destructuredDefault: 2 },
  'yargs@17.7.2/helpers': { named: ['--flag'] },
  'simple-git@3.28.0': { direct: 'function', destructuredDefault: 'function', named: 'function' },
  'simple-git@4.0.2': { named: 'function', destructuredDefault: 'function' },
  'fs-extra@11.3.0': { direct: functions, destructuredDefault: functions },
  'semver@7.7.2': { direct: '1.2.3', destructuredDefault: '4.5.6' },
  '@octokit/rest@21.1.1': { named: 'function' },
  'ink@5.2.1': { named: ['function', 'object'] },
  'ink@5.2.1/build/index.js': { named: ['function', 'object'] },
}

// Bun exposes every CommonJS property as a named export, so use-m returns the
// namespace for yargs@17 and simple-git@3 there, exactly as 8.16.2 did. On Bun
// the portable form is `const { default: x } = await use(...)`.
const expectedOnBun = {
  ...expected,
  'yargs@17.7.2': { ...expected['yargs@17.7.2'], direct: 'throws' },
  'simple-git@3.28.0': { ...expected['simple-git@3.28.0'], direct: 'throws' },
}

// The probe reports a failing pattern as `{ error: message }`. Messages differ
// between runtimes, so only the fact that the pattern threw is compared.
const withoutMessages = (results) => Object.fromEntries(Object.entries(results).map(([specifier, checks]) => [
  specifier,
  Object.fromEntries(Object.entries(checks).map(([name, value]) => [
    name,
    value && typeof value === 'object' && !Array.isArray(value) && 'error' in value ? 'throws' : value,
  ])),
]))

const runProbe = (implementation) => {
  // The unexported ink subpath is requested twice to prove its warning is
  // emitted only once per process.
  const specifiers = [...Object.keys(expected), 'ink@5.2.1/build/index.js']
  const result = spawnSync(process.execPath, [probePath, implementation, ...specifiers], {
    encoding: 'utf8',
    timeout,
    maxBuffer: 16 * 1024 * 1024,
  })
  if (result.status !== 0) {
    throw new Error(`Probe '${implementation}' exited with ${result.status}: ${result.error || result.stderr}`)
  }
  return { results: JSON.parse(result.stdout), stderr: result.stderr }
}

const expectShapeContract = (implementation) => {
  const { results, stderr } = runProbe(implementation)
  expect(withoutMessages(results)).toEqual(isBun ? expectedOnBun : expected)
  const warnings = stderr.split('[USE_M_UNEXPORTED_SUBPATH]').length - 1
  expect(warnings).toBe(1)
  expect(stderr).toContain("Package subpath './build/index.js' is not exported")
}

describe(`${moduleName} module shape contract (issue #83)`, () => {
  for (const implementation of ['mjs', 'cjs', 'universal', 'root-universal']) {
    test(`${moduleName} keeps every documented access pattern working in the ${implementation} build`, () => {
      if (isDeno) return
      expectShapeContract(implementation)
    }, timeout)
  }
})
