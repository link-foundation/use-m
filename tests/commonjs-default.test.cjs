const { execFileSync } = require('node:child_process')
const { pathToFileURL } = require('node:url')
const path = require('node:path')
const { makeUse } = require('../src/use.cjs')
const { describe, test, expect } = require('../src/test-adapter.cjs')

const moduleName = `[${__filename.split('.').pop()} module]`
const fixtureUrl = pathToFileURL(path.join(__dirname, 'fixtures/callable-commonjs/outer.cjs')).href
const probePath = path.join(__dirname, 'fixtures/callable-commonjs/probe.mjs')

const inspectLoadedFixture = (loaded) => ({
  type: typeof loaded,
  result: typeof loaded === 'function' ? loaded() : null,
  attachedType: typeof loaded?.attached,
  attachedResult: typeof loaded?.attached === 'function' ? loaded.attached() : null
})

const loadFixture = async () => {
  // Jest's VM-module importer omits Node's synthetic `module.exports` marker.
  // A fresh Node process exercises the native loader shape that regressed.
  if (typeof Deno === 'undefined' && typeof Bun === 'undefined') {
    return JSON.parse(execFileSync(process.execPath, [probePath, 'cjs'], { encoding: 'utf8' }))
  }

  const load = await makeUse({ specifierResolver: () => fixtureUrl })
  return inspectLoadedFixture(await load('callable-commonjs-fixture'))
}

describe(`${moduleName} callable CommonJS default`, () => {
  test(`${moduleName} unwraps a callable re-export with attached properties`, async () => {
    // This regression covers Node's synthetic CommonJS namespace marker. Bun
    // exposes the attached property as a real named export instead.
    if (typeof Bun !== 'undefined') return

    const loaded = await loadFixture()

    expect(loaded.type).toBe('function')
    expect(loaded.result).toBe('called')
    expect(loaded.attachedType).toBe('function')
    expect(loaded.attachedResult).toBe('attached')
  })
})
