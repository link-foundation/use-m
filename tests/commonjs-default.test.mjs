import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { makeUse } from '../src/use.mjs'
import { describe, test, expect } from '../src/test-adapter.mjs'

const moduleName = `[${import.meta.url.split('.').pop()} module]`
const fixtureUrl = new URL('./fixtures/callable-commonjs/outer.cjs', import.meta.url).href
const probePath = fileURLToPath(new URL('./fixtures/callable-commonjs/probe.mjs', import.meta.url))

const inspectLoadedFixture = (loaded) => ({
  type: typeof loaded,
  result: typeof loaded === 'function' ? loaded() : null,
  attachedType: typeof loaded?.attached,
  attachedResult: typeof loaded?.attached === 'function' ? loaded.attached() : null
})

const loadFixture = async (implementation = 'mjs') => {
  // Jest's VM-module importer omits Node's synthetic `module.exports` marker.
  // A fresh Node process exercises the native loader shape that regressed.
  if (typeof Deno === 'undefined' && typeof Bun === 'undefined') {
    return JSON.parse(execFileSync(process.execPath, [probePath, implementation], { encoding: 'utf8' }))
  }

  const load = await makeUse({ specifierResolver: () => fixtureUrl })
  return inspectLoadedFixture(await load('callable-commonjs-fixture'))
}

const expectCallableFixture = (loaded) => {
  expect(loaded.type).toBe('function')
  expect(loaded.result).toBe('called')
  expect(loaded.attachedType).toBe('function')
  expect(loaded.attachedResult).toBe('attached')
}

describe(`${moduleName} callable CommonJS default`, () => {
  test(`${moduleName} unwraps a callable re-export with attached properties`, async () => {
    // This regression covers Node's synthetic CommonJS namespace marker. Bun
    // exposes the attached property as a real named export instead.
    if (typeof Bun !== 'undefined') return

    expectCallableFixture(await loadFixture())
  })

  test(`${moduleName} unwraps the same shape in the universal build`, async () => {
    if (typeof Deno !== 'undefined' || typeof Bun !== 'undefined') return

    expectCallableFixture(await loadFixture('universal'))
  })
})
