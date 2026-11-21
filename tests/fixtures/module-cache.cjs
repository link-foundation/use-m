const { execFile } = require('node:child_process')
const { mkdtemp, readFile, rm, writeFile } = require('node:fs/promises')
const { tmpdir } = require('node:os')
const path = require('node:path')
const { pathToFileURL } = require('node:url')
const { promisify } = require('node:util')
const { createEngineFixture, enginePackument } = require('./npm-engines.cjs')

const runNode = promisify(execFile)
const virtualModule = source => `data:text/javascript,${encodeURIComponent(source)}`

exports.testModuleCache = ({ describe, test, expect }, { baseUse, makeUse, resolvers, use }, entryUrl) => {
  describe('in-memory module cache', () => {
    test('shares built-ins across calls and keeps subpaths separate', async () => {
      const [fs, nodeFs, promises] = await use.all('fs', 'node:fs', 'node:fs/promises')
      expect(fs).toBe(nodeFs)
      expect(promises).not.toBe(fs)
      expect(typeof fs.readFile).toBe('function')
      expect(typeof promises.readFile).toBe('function')
    })

    test('reuses imports across calls while preserving live default exports', async () => {
      const directory = await mkdtemp(path.join(tmpdir(), 'use-m-live-default-'))
      try {
        const file = path.join(directory, 'live.mjs')
        await writeFile(file, `
          let value = () => { value = 2; return 1 }
          export { value as default }
        `)
        const url = pathToFileURL(file).href
        const change = await baseUse(url)
        expect(await baseUse(url)).toBe(change)
        expect(change()).toBe(1)
        expect(await baseUse(url)).toBe(2)
      } finally {
        await rm(directory, { recursive: true, force: true })
      }
    })

    test('evicts older entries once the shared cache is full', async () => {
      const first = await use('performance')
      for (let index = 0; index < 256; index++) {
        await baseUse(virtualModule(`export default ${index}`))
      }
      expect(await use('performance')).not.toBe(first)
    })

    test('preserves relative imports from distinct callers', async () => {
      const load = await makeUse()
      const rootCaller = new URL('./caller.mjs', entryUrl).href
      const sourceCaller = new URL('./src/caller.mjs', entryUrl).href
      const root = await load('./use.mjs', rootCaller)
      const source = await load('./use.mjs', sourceCaller)
      expect(root).toBe(await load('./use.mjs', rootCaller))
      expect(source).toBe(await load('./use.mjs', sourceCaller))
      expect(root.use).not.toBe(source.use)
    })

    test('retries failed requests and reuses the winning mirror after success', async () => {
      const { esm, jspm } = resolvers
      const mirrors = []
      let online = false
      resolvers.esm = () => {
        mirrors.push('esm')
        throw new Error('first mirror unavailable')
      }
      resolvers.jspm = () => {
        mirrors.push('jspm')
        if (!online) throw new Error('second mirror unavailable')
        return virtualModule('export const loaded = true')
      }
      try {
        const load = await makeUse({ specifierResolvers: ['esm', 'jspm'] })
        await expect(load('cache-mirror-fixture')).rejects.toThrow('from any CDN mirror')
        online = true
        const loaded = await load('cache-mirror-fixture')
        expect(loaded.loaded).toBe(true)
        expect(await load('cache-mirror-fixture')).toBe(loaded)
        expect(mirrors).toEqual(['esm', 'jspm', 'esm', 'jspm'])
      } finally {
        Object.assign(resolvers, { esm, jspm })
      }
    })

    test('reuses package resolutions and reads the entry point again after expiration', async () => {
      const fixture = await createEngineFixture(enginePackument())
      try {
        const { stdout } = await runNode('node', ['--input-type=module', '--eval', `
          import { mkdir, writeFile } from 'node:fs/promises'
          import path from 'node:path'

          const actualNow = performance.now.bind(performance)
          let offset = 0
          Object.defineProperty(performance, 'now', { value: () => actualNow() + offset })
          const api = await import(process.argv[1])
          const { use } = api.default || api
          const selector = 'fixture-pkg@1.2.0/item'
          const entryRoot = path.join(process.env.USE_M_ENGINE_MODULES, 'fixture-pkg-v-1.2.0')
          const manifestPath = path.join(entryRoot, 'package.json')
          const writeManifest = file => writeFile(manifestPath, JSON.stringify({
            version: '1.2.0', type: 'commonjs', main: 'index.js', exports: { './item': file },
          }))
          await mkdir(entryRoot, { recursive: true })
          await writeFile(path.join(entryRoot, 'index.js'), 'module.exports = {version:"1.2.0"}')
          await writeManifest('./index.js')
          const original = await use(selector)
          await writeFile(path.join(entryRoot, 'replacement.js'), 'module.exports = {version:"replacement"}')
          await writeManifest('./replacement.js')
          const warm = await use(selector)
          const other = await use('fixture-pkg@1.10.0')
          offset = 60_001
          const expired = await use(selector)
          console.log(JSON.stringify([original.version, warm === original, other.version, expired.version]))
        `, entryUrl], { env: fixture.options.env })
        expect(JSON.parse(stdout)).toEqual(['1.2.0', true, '1.10.0', 'replacement'])
        expect((await fixture.calls()).filter(args => args[0] === 'root')).toHaveLength(3)
      } finally {
        await fixture.cleanup()
      }
    })

    test('expires built-ins while idle in the universal bundle', async () => {
      const bundle = await readFile(new URL('./use.js', entryUrl), 'utf8')
      let now = 0
      const scheduled = []
      const evaluate = (performance, setTimeout, window, Deno) => eval(bundle)
      const { use: universalUse } = evaluate({ now: () => now }, (run, delay) => {
        return scheduled.push({ run, delay })
      }, {}, undefined)

      const first = await universalUse('url')
      now = 20_000
      const second = await universalUse('crypto')
      expect(await universalUse('node:url')).toBe(first)
      expect(scheduled.map(timer => timer.delay)).toEqual([60_000])

      now = 60_000
      scheduled.shift().run()
      expect(scheduled.map(timer => timer.delay)).toEqual([20_000])
      expect(await universalUse('crypto')).toBe(second)
      // Move the test clock back briefly to distinguish removal by the timer
      // from a lookup that merely finds an expired entry.
      now = 30_000
      expect(await universalUse('url')).not.toBe(first)
    })
  })
}
