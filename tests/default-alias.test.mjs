import { makeUse } from '../src/use.mjs'
import { describe, test, expect } from '../src/test-adapter.mjs'

// `use()` unwraps a namespace whose only export is `default`. Callers written
// for the namespace shape destructure `default` instead, so the unwrapped
// value gets a non-enumerable `default` self-reference (issue #83).
const moduleName = `[${import.meta.url.split('.').pop()} module]`

const loadFixture = async (name) => {
  const url = new URL(`./fixtures/module-shape/${name}`, import.meta.url).href
  const load = await makeUse({ specifierResolver: () => url })
  return load(`module-shape-${name}`)
}

describe(`${moduleName} default alias for unwrapped modules (issue #83)`, () => {
  test(`${moduleName} supports both the direct and the destructured default form`, async () => {
    const greet = await loadFixture('default-function.mjs')
    const { default: destructured } = await loadFixture('default-function.mjs')

    expect(greet('direct')).toBe('hello direct')
    expect(destructured).toBe(greet)
    expect(destructured('default')).toBe('hello default')
    expect(greet.default.default).toBe(greet)
  })

  test(`${moduleName} keeps the alias out of enumeration`, async () => {
    const greet = await loadFixture('default-function.mjs')

    expect(Object.keys(greet)).toEqual(['version'])
    expect(Object.getOwnPropertyDescriptor(greet, 'default').enumerable).toBe(false)
    expect(JSON.stringify({ ...greet })).toBe('{"version":"1.0.0"}')
  })

  test(`${moduleName} leaves frozen default exports untouched`, async () => {
    const frozen = await loadFixture('frozen-default.mjs')

    expect(frozen).toEqual({ value: 42 })
    expect(Object.isFrozen(frozen)).toBe(true)
    expect('default' in frozen).toBe(false)
  })

  test(`${moduleName} keeps a default property the module already defines`, async () => {
    const factory = await loadFixture('own-default.mjs')

    expect(factory()).toBe('factory')
    expect(factory.default).toBe('own default')
  })

  test(`${moduleName} returns namespaces with named exports unchanged`, async () => {
    const namespace = await loadFixture('named-exports.mjs')

    expect(namespace.named).toBe('named')
    expect(namespace.default).toEqual({ value: 'default' })
    expect('default' in namespace.default).toBe(false)
  })
})
