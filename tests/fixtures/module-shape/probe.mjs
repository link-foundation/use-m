// Loads packages people commonly fetch through use-m and reports how each
// documented access pattern behaves (issue #83). It runs in a fresh process
// because Jest's VM-module importer does not reproduce Node's CommonJS
// interop shape, which is exactly what this contract pins down.
//
// Usage: node probe.mjs <mjs|cjs|universal|root-universal> [specifier...]
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'

const implementation = process.argv[2] || 'mjs'
let use

if (implementation === 'cjs') {
  ({ use } = createRequire(import.meta.url)('../../../src/use.cjs'))
} else if (implementation === 'universal' || implementation === 'root-universal') {
  // `root-universal` is the bundle behind https://unpkg.com/use-m/use.js,
  // which consumers fetch and eval at runtime.
  const file = implementation === 'universal' ? '../../../src/use.js' : '../../../use.js'
  // eslint-disable-next-line no-eval
  ;({ use } = eval(await readFile(new URL(file, import.meta.url), 'utf8')))
} else {
  ({ use } = await import('../../../src/use.mjs'))
}

const parseCount = (yargs, count) => yargs(['--count', String(count)]).parse().count
// yargs@17's CommonJS entry copies its singleton's methods onto the exported
// function, so `.default` there is yargs' own chainable `default()` method, as
// it was in use-m 8.16.2. Either way the call must return a yargs instance.
const chainsToYargs = yargs => typeof yargs(['--count', '2']).parse

// Each entry maps a specifier to the access patterns callers rely on. Every
// pattern runs on its own, and results are plain JSON, so the test shows
// exactly which pattern changed.
export const patterns = {
  'yargs@17.7.2': {
    direct: mod => parseCount(mod, 1),
    destructuredDefault: ({ default: yargs }) => chainsToYargs(yargs),
  },
  'yargs@18.0.0': {
    direct: mod => parseCount(mod, 1),
    destructuredDefault: ({ default: yargs }) => parseCount(yargs, 2),
  },
  'yargs@17.7.2/helpers': {
    named: ({ hideBin }) => hideBin(['node', 'script.js', '--flag']),
  },
  'simple-git@3.28.0': {
    direct: mod => typeof mod().status,
    destructuredDefault: ({ default: simpleGit }) => typeof simpleGit().status,
    named: ({ simpleGit }) => typeof simpleGit().status,
  },
  'simple-git@4.0.2': {
    named: ({ simpleGit }) => typeof simpleGit().status,
    destructuredDefault: ({ default: simpleGit }) => typeof simpleGit.simpleGit().status,
  },
  'fs-extra@11.3.0': {
    direct: fs => [typeof fs.ensureDir, typeof fs.remove],
    destructuredDefault: ({ default: fs }) => [typeof fs.ensureDir, typeof fs.remove],
  },
  'semver@7.7.2': {
    direct: semver => semver.valid('1.2.3'),
    destructuredDefault: ({ default: semver }) => semver.valid('4.5.6'),
  },
  '@octokit/rest@21.1.1': {
    named: ({ Octokit }) => typeof new Octokit().rest.repos.get,
  },
  'ink@5.2.1': {
    named: ({ render, Box }) => [typeof render, typeof Box],
  },
  'ink@5.2.1/build/index.js': {
    named: ({ render, Box }) => [typeof render, typeof Box],
  },
}

const firstLine = error => String(error?.message || error).split('\n')[0]
const specifiers = process.argv.slice(3).length ? process.argv.slice(3) : Object.keys(patterns)
const results = {}
for (const specifier of specifiers) {
  let mod
  try {
    mod = await use(specifier)
  } catch (error) {
    results[specifier] = { error: firstLine(error) }
    continue
  }
  results[specifier] = {}
  for (const [name, check] of Object.entries(patterns[specifier])) {
    try {
      results[specifier][name] = check(mod)
    } catch (error) {
      results[specifier][name] = { error: firstLine(error) }
    }
  }
}
process.stdout.write(JSON.stringify(results))
