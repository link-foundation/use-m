import assert from 'node:assert/strict'
import * as namespace from './callable-namespace.mjs'

const fixtureUrl = new URL('./callable-namespace.mjs', import.meta.url).href

export const checkCallableNamespace = async (use) => {
  const options = { specifierResolver: () => fixtureUrl }
  const loaded = await use('callable-namespace-fixture', options)
  const { default: original, $, name } = loaded
  const initialCalls = loaded.calls

  assert.equal(loaded('direct'), 'hello direct')
  assert.equal(loaded.call({ prefix: 'welcome' }, 'receiver'), 'welcome receiver')
  assert.equal(loaded.calls, initialCalls + 2)
  assert.equal(original, namespace.default)
  assert.equal(original('destructured'), 'hello destructured')
  assert.equal(new loaded('constructed').greeting, 'hello constructed')
  assert.ok(new loaded('instance') instanceof original)
  assert.equal($, namespace.$)
  assert.equal($(), 'named helper')
  assert.equal(name, 'named export')
  assert.equal(loaded.attached(), 'attached method')
  assert.ok('attached' in loaded)
  assert.equal(original.$(), 'default helper')
  assert.equal(original.default, 'existing default property')
  assert.ok(Object.isFrozen(original))
  assert.deepEqual(Reflect.ownKeys(loaded), Reflect.ownKeys(namespace))
  assert.deepEqual({ ...loaded }, { ...namespace })
  assert.equal(Reflect.set(loaded, 'calls', 0), false)
  assert.equal(await use('callable-namespace-fixture', options), loaded)
}
