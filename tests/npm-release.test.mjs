import { describe, expect, test } from '../src/test-adapter.mjs'
import {
  backfillReleases,
  buildRegistryUrl,
  checkNpmVersion,
  ensureRelease,
  parseArgs,
  waitForNpmVersion
} from '../scripts/npm-release.mjs'

const HEAD_A = 'a'.repeat(40)
const HEAD_B = 'b'.repeat(40)

function jsonResponse(status, body) {
  return { status, ok: status >= 200 && status < 300, json: async () => body }
}

function fakeFetch(responses) {
  const requests = []
  const fetchFn = async (url, init) => {
    requests.push({ url, init })
    const next = responses.shift()
    if (next instanceof Error) {
      throw next
    }
    return next
  }
  return { fetchFn, requests }
}

// Simulates `gh` and `git`: `tags` and `releases` exist on GitHub, `onMain`
// lists the commits `git merge-base --is-ancestor` accepts.
function fakeRunner({ tags = [], releases = [], onMain = [], failWith } = {}) {
  const calls = []
  const run = async (command, args) => {
    calls.push([command, ...args])
    if (failWith) {
      return { code: 1, stdout: '', stderr: failWith }
    }
    if (command === 'gh' && args[0] === 'api') {
      const tag = args[1].split('/').pop()
      return tags.includes(tag) ? { code: 0, stdout: '', stderr: '' } : { code: 1, stdout: '', stderr: 'gh: Not Found (HTTP 404)' }
    }
    if (command === 'gh' && args[0] === 'release' && args[1] === 'view') {
      return releases.includes(args[2]) ? { code: 0, stdout: '{}', stderr: '' } : { code: 1, stdout: '', stderr: 'release not found' }
    }
    if (command === 'git') {
      return { code: onMain.includes(args[2]) ? 0 : 1, stdout: '', stderr: '' }
    }
    return { code: 0, stdout: '', stderr: '' }
  }
  return { run, calls }
}

const quiet = () => {}

describe('npm release helper', () => {
  test('builds per-version registry URLs, including scoped names', () => {
    expect(buildRegistryUrl('use-m', '8.16.4')).toBe('https://registry.npmjs.org/use-m/8.16.4')
    expect(buildRegistryUrl('@scope/pkg', '1.0.0', 'https://example.test')).toBe('https://example.test/@scope%2Fpkg/1.0.0')
    expect(buildRegistryUrl('use-m')).toBe('https://registry.npmjs.org/use-m')
  })

  test('bypasses the registry CDN cache on every check', async () => {
    // The registry answers with `cache-control: max-age=300`, so a cached 404
    // could hide a fresh publish for five minutes.
    const { fetchFn, requests } = fakeFetch([jsonResponse(200, { version: '1.0.0', gitHead: HEAD_A })])
    const result = await checkNpmVersion({ name: 'use-m', version: '1.0.0', fetchFn, now: () => 42 })

    expect(result).toEqual({ status: 'published', httpStatus: 200, gitHead: HEAD_A })
    expect(requests[0].url).toBe('https://registry.npmjs.org/use-m/1.0.0?cache-bust=42')
    expect(requests[0].init.headers['cache-control']).toBe('no-cache')
  })

  test('reports an unreachable registry as unknown instead of not published', async () => {
    // The old `npm view ... >/dev/null 2>&1 || publish` treated any error as
    // "not published" and walked into a publish conflict.
    const offline = fakeFetch([new TypeError('fetch failed')])
    const serverError = fakeFetch([jsonResponse(503, {})])
    const missing = fakeFetch([jsonResponse(404, {})])

    expect((await checkNpmVersion({ name: 'use-m', version: '1.0.0', fetchFn: offline.fetchFn })).status).toBe('unknown')
    expect((await checkNpmVersion({ name: 'use-m', version: '1.0.0', fetchFn: serverError.fetchFn })).status).toBe('unknown')
    expect((await checkNpmVersion({ name: 'use-m', version: '1.0.0', fetchFn: missing.fetchFn })).status).toBe('not-published')
  })

  test('waits through the multi-minute delay npm needs after publishing', async () => {
    // Issue #76: 8.16.1 and 8.16.2 became visible 2.6 and 5.2 minutes after
    // `npm publish`, while the workflow stopped polling after 100 seconds.
    let seconds = 0
    const visibleAfterSeconds = 5.2 * 60
    const fetchFn = async () => (seconds >= visibleAfterSeconds ? jsonResponse(200, { version: '8.16.2' }) : jsonResponse(404, {}))
    const result = await waitForNpmVersion({
      name: 'use-m',
      version: '8.16.2',
      fetchFn,
      clock: () => seconds * 1000,
      sleepFn: async (interval) => {
        seconds += interval
      },
      log: quiet
    })

    expect(result.status).toBe('published')
    expect(result.elapsedSeconds).toBe(315)
  })

  test('gives up once the timeout is spent', async () => {
    let seconds = 0
    const result = await waitForNpmVersion({
      name: 'use-m',
      version: '9.9.9',
      fetchFn: async () => jsonResponse(404, {}),
      timeoutSeconds: 60,
      intervalSeconds: 15,
      clock: () => seconds * 1000,
      sleepFn: async (interval) => {
        seconds += interval
      },
      log: quiet
    })

    expect(result).toEqual({ status: 'not-published', httpStatus: 404, attempts: 5, elapsedSeconds: 60 })
  })

  test('creates the tag and release together on the server', async () => {
    const { run, calls } = fakeRunner()
    await ensureRelease({ run, repo: 'o/r', name: 'use-m', version: '1.0.0', target: HEAD_A, log: quiet })

    expect(calls.at(-1)).toEqual([
      'gh', 'release', 'create', 'v1.0.0', '--repo', 'o/r', '--title', 'v1.0.0',
      '--notes', 'npm: https://www.npmjs.com/package/use-m/v/1.0.0', '--latest=true', '--target', HEAD_A
    ])
  })

  test('adds only the missing release when the tag exists, and does nothing when both exist', async () => {
    const tagOnly = fakeRunner({ tags: ['v1.0.0'] })
    await ensureRelease({ run: tagOnly.run, repo: 'o/r', name: 'use-m', version: '1.0.0', log: quiet })
    expect(tagOnly.calls.at(-1)).toContain('--verify-tag')

    const complete = fakeRunner({ tags: ['v1.0.0'], releases: ['v1.0.0'] })
    const result = await ensureRelease({ run: complete.run, repo: 'o/r', name: 'use-m', version: '1.0.0', log: quiet })
    expect(result.created).toBe(false)
    expect(complete.calls.some((call) => call[2] === 'create')).toBe(false)
  })

  test('refuses to treat a failing GitHub API as a missing tag', async () => {
    const { run } = fakeRunner({ failWith: 'HTTP 401: Bad credentials' })
    await expect(ensureRelease({ run, repo: 'o/r', name: 'use-m', version: '1.0.0', target: HEAD_A, log: quiet }))
      .rejects.toThrow('could not check tag v1.0.0')
  })

  test('backfills CI-published versions that have no tag or release, at the commit npm recorded', async () => {
    const packument = {
      versions: {
        '8.10.5': {},
        '8.16.0': { gitHead: HEAD_A },
        '8.16.1': { gitHead: HEAD_A },
        '8.16.2': { gitHead: HEAD_B }
      }
    }
    const { fetchFn } = fakeFetch([jsonResponse(200, packument)])
    const { run, calls } = fakeRunner({ tags: ['v8.16.0'], releases: ['v8.16.0'], onMain: [HEAD_A] })
    const log = []
    const result = await backfillReleases({ run, repo: 'o/r', name: 'use-m', fetchFn, log: (line) => log.push(line) })

    // 8.10.5 was published by hand without a gitHead; 8.16.2's commit is not
    // on this branch, so it is reported instead of guessed.
    expect(result).toEqual({ repaired: ['8.16.1'], skipped: ['8.16.2'] })
    const created = calls.filter((call) => call[2] === 'create')
    expect(created).toHaveLength(1)
    expect(created[0]).toContain('--latest=false')
    expect(created[0].slice(-2)).toEqual(['--target', HEAD_A])
    expect(log.some((line) => line.startsWith('::warning::use-m@8.16.2'))).toBe(true)
  })

  test('dry runs report the repair without creating anything', async () => {
    const { fetchFn } = fakeFetch([jsonResponse(200, { versions: { '1.0.0': { gitHead: HEAD_A } } })])
    const { run, calls } = fakeRunner({ onMain: [HEAD_A] })
    const result = await backfillReleases({ run, repo: 'o/r', name: 'use-m', fetchFn, dryRun: true, log: quiet })

    expect(result.repaired).toEqual(['1.0.0'])
    expect(calls.some((call) => call[2] === 'create')).toBe(false)
  })

  test('parses command line options', () => {
    expect(parseArgs(['wait', '--timeout-seconds', '900', '--interval-seconds=15', '--dry-run'])).toEqual({
      command: 'wait',
      options: { 'timeout-seconds': '900', 'interval-seconds': '15', 'dry-run': 'true' }
    })
  })
})
