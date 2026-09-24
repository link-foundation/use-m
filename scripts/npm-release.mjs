#!/usr/bin/env node
// Release helper for .github/workflows/release.yml (issue #76).
//
// npm accepts `npm publish` immediately but processes the version
// asynchronously: use-m 8.16.1 and 8.16.2 only became visible 2.6 and 5.2
// minutes after `+ use-m@<version>` was printed, while the workflow gave up
// after 100 seconds, before it created the git tag and GitHub release. This
// script keeps the registry checks, the long wait, and the tag/release repair
// in one tested place.
//
// Usage:
//   node scripts/npm-release.mjs check-unpublished [--version <v>]
//   node scripts/npm-release.mjs status   [--version <v>]
//   node scripts/npm-release.mjs wait     [--version <v>] [--timeout-seconds 900] [--interval-seconds 15]
//   node scripts/npm-release.mjs release  [--version <v>] --target <sha> [--latest true|false]
//   node scripts/npm-release.mjs backfill [--dry-run]
//
// The package name and version default to package.json. GITHUB_REPOSITORY
// selects the repository and GITHUB_OUTPUT receives step outputs.
// Set NPM_RELEASE_VERBOSE=1 to trace every registry request and command.

import { execFile } from 'node:child_process'
import { appendFileSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const DEFAULT_REGISTRY = 'https://registry.npmjs.org/'
export const DEFAULT_TIMEOUT_SECONDS = 900
export const DEFAULT_INTERVAL_SECONDS = 15

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

export function buildRegistryUrl(name, version, registry = DEFAULT_REGISTRY) {
  const base = registry.endsWith('/') ? registry : `${registry}/`
  // Scoped names keep their `@` but encode the slash, as the registry expects.
  const encodedName = name.startsWith('@') ? `@${encodeURIComponent(name.slice(1))}` : encodeURIComponent(name)
  return version === undefined ? `${base}${encodedName}` : `${base}${encodedName}/${encodeURIComponent(version)}`
}

// The registry CDN caches documents for 300 s (`cache-control: max-age=300`),
// including the 404 a poll sees right after publishing. A unique query string
// is not a cache key it has seen, so every poll reaches the origin.
function cacheBusted(url, now) {
  return `${url}?cache-bust=${now()}`
}

async function fetchRegistryJson(url, { fetchFn, now, trace }) {
  const requestUrl = cacheBusted(url, now)
  trace(`GET ${requestUrl}`)
  try {
    const response = await fetchFn(requestUrl, {
      headers: { accept: 'application/json', 'cache-control': 'no-cache', 'user-agent': 'use-m release workflow' }
    })
    trace(`HTTP ${response.status} for ${requestUrl}`)
    if (response.status === 404) {
      return { status: 'missing', httpStatus: 404 }
    }
    if (!response.ok) {
      return { status: 'unknown', httpStatus: response.status, error: `HTTP ${response.status}` }
    }
    return { status: 'ok', httpStatus: response.status, body: await response.json() }
  } catch (error) {
    const cause = error?.cause?.message
    return { status: 'unknown', error: cause ? `${error.message}: ${cause}` : String(error?.message ?? error) }
  }
}

// Returns 'published', 'not-published', or 'unknown'. An unreachable
// registry is 'unknown', never 'not-published': treating it as missing would
// send the workflow into a publish that npm then rejects as a conflict.
export async function checkNpmVersion({ name, version, registry, fetchFn = fetch, now = Date.now, trace = () => {} }) {
  const result = await fetchRegistryJson(buildRegistryUrl(name, version, registry), { fetchFn, now, trace })
  if (result.status === 'missing') {
    return { status: 'not-published', httpStatus: 404 }
  }
  if (result.status === 'unknown') {
    return result
  }
  return result.body?.version === version
    ? { status: 'published', httpStatus: result.httpStatus, gitHead: result.body.gitHead }
    : { status: 'unknown', httpStatus: result.httpStatus, error: `registry answered with version ${result.body?.version}` }
}

export async function waitForNpmVersion({
  timeoutSeconds = DEFAULT_TIMEOUT_SECONDS,
  intervalSeconds = DEFAULT_INTERVAL_SECONDS,
  sleepFn = (seconds) => new Promise((resolve) => setTimeout(resolve, seconds * 1000)),
  clock = () => Date.now(),
  log = console.log,
  ...checkOptions
}) {
  const startedAt = clock()
  for (let attempt = 1; ; attempt++) {
    const result = await checkNpmVersion(checkOptions)
    const elapsedSeconds = Math.round((clock() - startedAt) / 1000)
    const detail = result.error ? ` (${result.error})` : ''
    log(`${checkOptions.name}@${checkOptions.version}: ${result.status}${detail} after ${elapsedSeconds}s (attempt ${attempt})`)
    if (result.status === 'published') {
      return { ...result, attempts: attempt, elapsedSeconds }
    }
    if (elapsedSeconds + intervalSeconds > timeoutSeconds) {
      return { ...result, attempts: attempt, elapsedSeconds }
    }
    await sleepFn(intervalSeconds)
  }
}

export function createRunner({ trace = () => {} } = {}) {
  return (command, args) =>
    new Promise((resolve) => {
      trace(`$ ${command} ${args.join(' ')}`)
      execFile(command, args, { cwd: rootDir, maxBuffer: 64 * 1024 * 1024 }, (error, stdout, stderr) => {
        const code = error ? (typeof error.code === 'number' ? error.code : 1) : 0
        trace(`exit ${code}${stderr ? `: ${stderr.trim()}` : ''}`)
        resolve({ code, stdout: String(stdout), stderr: String(stderr) })
      })
    })
}

// `gh` exits 1 for "not found" and for every other failure, so the message
// decides. Anything that is not clearly a 404 is an error, never "missing".
function isNotFound(result) {
  return /HTTP 404|release not found|Not Found/i.test(result.stderr)
}

async function ghExists(run, args, what) {
  const result = await run('gh', args)
  if (result.code === 0) {
    return true
  }
  if (isNotFound(result)) {
    return false
  }
  throw new Error(`could not check ${what}: ${result.stderr.trim() || `gh exited with ${result.code}`}`)
}

export function tagExists({ run, repo, tag }) {
  return ghExists(run, ['api', `repos/${repo}/git/ref/tags/${tag}`, '--silent'], `tag ${tag}`)
}

export function releaseExists({ run, repo, tag }) {
  return ghExists(run, ['release', 'view', tag, '--repo', repo, '--json', 'tagName'], `release ${tag}`)
}

export function releaseNotes(name, version) {
  return `npm: https://www.npmjs.com/package/${name}/v/${version}`
}

// Creates whatever is missing of the tag and the GitHub release. When the tag
// does not exist yet, `gh release create --target` creates it on the server,
// so the job needs no git credentials.
export async function ensureRelease({ run, repo, name, version, target, latest = true, dryRun = false, log = console.log }) {
  const tag = `v${version}`
  const [hasTag, hasRelease] = [await tagExists({ run, repo, tag }), await releaseExists({ run, repo, tag })]
  if (hasTag && hasRelease) {
    log(`Tag and GitHub release ${tag} already exist.`)
    return { tag, created: false }
  }
  if (!hasTag && !target) {
    throw new Error(`tag ${tag} does not exist and no --target commit was given`)
  }
  const args = ['release', 'create', tag, '--repo', repo, '--title', tag, '--notes', releaseNotes(name, version), `--latest=${latest}`]
  args.push(...(hasTag ? ['--verify-tag'] : ['--target', target]))
  log(`${dryRun ? 'Would create' : 'Creating'} GitHub release ${tag}${hasTag ? ' for the existing tag' : ` and tag at ${target}`}.`)
  if (!dryRun) {
    const result = await run('gh', args)
    if (result.code !== 0) {
      throw new Error(`gh release create ${tag} failed: ${result.stderr.trim()}`)
    }
  }
  return { tag, created: true }
}

// Every version npm records a gitHead for was published from this repository
// by CI. Any of them without a tag or release is a leftover of a failed run
// (8.16.1 and 8.16.2), so it is repaired at the commit npm recorded - but only
// when that commit is on the default branch.
export async function backfillReleases({ run, repo, name, registry, fetchFn = fetch, now = Date.now, trace = () => {}, dryRun = false, log = console.log }) {
  const packument = await fetchRegistryJson(buildRegistryUrl(name, undefined, registry), { fetchFn, now, trace })
  if (packument.status !== 'ok') {
    throw new Error(`could not read ${name} from the registry: ${packument.error ?? packument.status}`)
  }
  const repaired = []
  const skipped = []
  for (const [version, manifest] of Object.entries(packument.body.versions ?? {})) {
    const gitHead = manifest?.gitHead
    if (typeof gitHead !== 'string' || !/^[0-9a-f]{40}$/.test(gitHead)) {
      continue
    }
    const tag = `v${version}`
    if ((await tagExists({ run, repo, tag })) && (await releaseExists({ run, repo, tag }))) {
      continue
    }
    const ancestor = await run('git', ['merge-base', '--is-ancestor', gitHead, 'HEAD'])
    if (ancestor.code !== 0) {
      log(`::warning::${name}@${version} has no tag or release, but its gitHead ${gitHead} is not on this branch; not repairing it.`)
      skipped.push(version)
      continue
    }
    await ensureRelease({ run, repo, name, version, target: gitHead, latest: false, dryRun, log })
    repaired.push(version)
  }
  log(repaired.length ? `${dryRun ? 'Would repair' : 'Repaired'} releases: ${repaired.join(', ')}` : 'Every CI-published version has a tag and a GitHub release.')
  return { repaired, skipped }
}

export function parseArgs(argv) {
  const [command, ...rest] = argv
  const options = {}
  for (let index = 0; index < rest.length; index++) {
    const arg = rest[index]
    if (!arg.startsWith('--')) {
      throw new Error(`Unexpected argument: ${arg}`)
    }
    const [key, inline] = arg.slice(2).split(/=(.*)/s)
    if (inline !== undefined) {
      options[key] = inline
    } else if (rest[index + 1] !== undefined && !rest[index + 1].startsWith('--')) {
      options[key] = rest[++index]
    } else {
      options[key] = 'true'
    }
  }
  return { command, options }
}

function positiveNumber(value, fallback, option) {
  if (value === undefined) {
    return fallback
  }
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`--${option} must be a positive number`)
  }
  return parsed
}

function setOutputs(outputs, env) {
  for (const [key, value] of Object.entries(outputs)) {
    console.log(`${key}=${value}`)
    if (env.GITHUB_OUTPUT) {
      appendFileSync(env.GITHUB_OUTPUT, `${key}=${value}\n`)
    }
  }
}

export async function main(argv = process.argv.slice(2), env = process.env) {
  const { command, options } = parseArgs(argv)
  const verbose = env.NPM_RELEASE_VERBOSE === '1'
  const trace = verbose ? (message) => console.error(`[npm-release] ${message}`) : () => {}
  const packageJson = JSON.parse(readFileSync(path.join(rootDir, 'package.json'), 'utf8'))
  const name = options.name ?? packageJson.name
  const version = options.version ?? packageJson.version
  const registry = env.NPM_CONFIG_REGISTRY || env.npm_config_registry || DEFAULT_REGISTRY
  const repo = options.repo ?? env.GITHUB_REPOSITORY
  const run = createRunner({ trace })
  const dryRun = options['dry-run'] === 'true'

  if (command === 'check-unpublished') {
    // Pull requests run this so a merge that would republish an existing
    // version fails before it reaches main instead of in the publish job.
    const npm = await checkNpmVersion({ name, version, registry, trace })
    if (npm.status === 'unknown') {
      console.error(`::error::Could not determine whether ${name}@${version} is on npm: ${npm.error}`)
      return 1
    }
    if (npm.status === 'published') {
      console.error(`::error file=package.json::${name}@${version} is already published. Update package.json to the next unpublished version before merging to main.`)
      return 1
    }
    console.log(`${name}@${version} is not on npm yet; merging this change publishes it.`)
    return 0
  }

  if (command === 'status') {
    const npm = await checkNpmVersion({ name, version, registry, trace })
    if (npm.status === 'unknown') {
      console.error(`::error::Could not determine whether ${name}@${version} is on npm: ${npm.error}`)
      return 1
    }
    const tag = `v${version}`
    setOutputs({
      exists: npm.status === 'published',
      tag_exists: await tagExists({ run, repo, tag }),
      release_exists: await releaseExists({ run, repo, tag })
    }, env)
    return 0
  }

  if (command === 'wait') {
    const result = await waitForNpmVersion({
      name,
      version,
      registry,
      trace,
      timeoutSeconds: positiveNumber(options['timeout-seconds'], DEFAULT_TIMEOUT_SECONDS, 'timeout-seconds'),
      intervalSeconds: positiveNumber(options['interval-seconds'], DEFAULT_INTERVAL_SECONDS, 'interval-seconds')
    })
    if (result.status !== 'published') {
      console.error(`::error::${name}@${version} was accepted by npm publish but is still not visible on ${registry} after ${result.elapsedSeconds}s. Check https://www.npmjs.com/package/${name}/v/${version}; re-running this job repairs the tag and release once it appears.`)
      return 1
    }
    console.log(`Verified ${name}@${version} on npm after ${result.elapsedSeconds}s.`)
    return 0
  }

  if (command === 'release') {
    // Tag the commit npm recorded, not the commit that happens to be building:
    // a repair run can happen on a later commit with the same version.
    const npm = await checkNpmVersion({ name, version, registry, trace })
    const target = /^[0-9a-f]{40}$/.test(npm.gitHead ?? '') ? npm.gitHead : options.target
    await ensureRelease({ run, repo, name, version, target, latest: options.latest !== 'false', dryRun })
    return 0
  }

  if (command === 'backfill') {
    await backfillReleases({ run, repo, name, registry, trace, dryRun })
    return 0
  }

  console.error('Usage: node scripts/npm-release.mjs <status|wait|release|backfill> [options]')
  return 1
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main().then(
    (code) => {
      process.exitCode = code
    },
    (error) => {
      console.error(`::error::${error.message}`)
      process.exitCode = 1
    }
  )
}
