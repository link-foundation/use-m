import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'

const [url, trustedBundlePath] = process.argv.slice(2)
if (!url || !trustedBundlePath) {
  throw new Error('Usage: node create-policy.mjs <bundle-url> <trusted-use.mjs>')
}

const bundleUrl = new URL(url)
const loopback = bundleUrl.protocol === 'http:' && bundleUrl.hostname === '127.0.0.1'
if (bundleUrl.protocol !== 'https:' && !loopback) {
  throw new Error('The bundle URL must use HTTPS or HTTP on 127.0.0.1')
}

const entry = new URL('./native-npm.mjs', import.meta.url)
const trustedBundle = await readFile(trustedBundlePath)
const integrity = 'sha384-' + createHash('sha384').update(trustedBundle).digest('base64')
const builtinImports = [
  'node:child_process', 'node:crypto', 'node:fs', 'node:fs/promises',
  'node:module', 'node:os', 'node:path', 'node:url', 'node:util',
]

console.log(JSON.stringify({
  // The local application and its npm packages use ordinary Node resolution.
  scopes: { 'file:': { integrity: true, dependencies: true } },
  resources: {
    [entry.href]: {
      cascade: true,
      integrity: true,
      dependencies: { 'node:path': 'node:path', 'node:url': 'node:url', [bundleUrl.href]: bundleUrl.href },
    },
    [bundleUrl.href]: {
      integrity,
      dependencies: Object.fromEntries(builtinImports.map(specifier => [specifier, specifier])),
    },
  },
}, null, 2))
