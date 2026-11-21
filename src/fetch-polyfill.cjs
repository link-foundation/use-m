'use strict'

// The complete set of web-platform globals supplied by Undici 6. `Blob` is
// provided by node:buffer, as it is in Node itself. The list is intentionally
// explicit so installation stays predictable when Undici adds non-standard
// client APIs to its exports.
const WEB_GLOBAL_NAMES = [
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

const loadImplementations = () => {
  const undici = require('undici')
  const { Blob } = require('node:buffer')
  return { ...undici, Blob }
}

/**
 * Add missing Web Fetch globals to a target object without replacing anything
 * the host already supplies.
 *
 * @param {typeof globalThis} target
 * @param {Record<string, unknown>} [suppliedImplementations] test/embed override
 * @returns {typeof globalThis}
 */
const installFetchGlobals = (target = globalThis, suppliedImplementations = undefined) => {
  const missing = WEB_GLOBAL_NAMES.filter(name => typeof target[name] === 'undefined')
  if (missing.length === 0) return target

  const implementations = suppliedImplementations ?? loadImplementations()
  for (const name of missing) {
    const implementation = implementations[name]
    if (typeof implementation === 'undefined') {
      throw new Error(`The fetch polyfill does not provide the required '${name}' global.`)
    }
    Object.defineProperty(target, name, {
      configurable: true,
      enumerable: false,
      value: implementation,
      writable: true,
    })
  }
  return target
}

installFetchGlobals()

const api = Object.fromEntries(WEB_GLOBAL_NAMES.map(name => [name, globalThis[name]]))
module.exports = {
  ...api,
  default: api.fetch,
  installFetchGlobals,
  WEB_GLOBAL_NAMES,
}
