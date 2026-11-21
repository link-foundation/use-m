#!/usr/bin/env node

/**
 * Reproduce issue #45 without depending on the host or the network.
 *
 * Run this file directly so the operating system/Git Bash follows the shebang:
 *   ./experiments/test-polyfill-no-fetch.mjs
 */

import assert from 'node:assert/strict'

const webGlobals = [
  'fetch',
  'Headers',
  'Request',
  'Response',
  'FormData',
  'File',
  'Blob',
  'FileReader',
  'WebSocket',
  'CloseEvent',
  'ErrorEvent',
  'MessageEvent',
  'EventSource',
  'caches',
]

for (const name of webGlobals) {
  Object.defineProperty(globalThis, name, {
    configurable: true,
    value: undefined,
    writable: true,
  })
}

const api = await import('../fetch-polyfill.js')

for (const name of webGlobals) {
  assert.notEqual(globalThis[name], undefined, `${name} was not installed`)
  assert.equal(api[name], globalThis[name], `${name} export differs from its global`)
}

const response = await fetch('data:application/json,%7B%22working%22%3Atrue%7D')
assert.equal(response.status, 200)
assert.deepEqual(await response.json(), { working: true })
assert.equal(api.default, globalThis.fetch)

console.log(`fetch polyfill passed through the shebang on ${process.platform} ${process.version}`)
