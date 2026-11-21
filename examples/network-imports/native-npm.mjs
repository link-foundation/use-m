import { isAbsolute } from 'node:path'
import { pathToFileURL } from 'node:url'

const [bundleUrl, ...packages] = process.argv.slice(2)
if (!bundleUrl || packages.length === 0) {
  throw new Error('Usage: node --experimental-network-imports --experimental-policy=policy.json native-npm.mjs <bundle-url> <package> [...]')
}

const { baseUse, makeUse } = await import(new URL(bundleUrl).href)

// This import runs from the local entry point, where Node can load paths
// returned by the npm resolver and follow the packages' own dependencies.
const importFromHost = (specifier, options) => {
  const target = isAbsolute(specifier) ? pathToFileURL(specifier) : specifier
  return import(target, options)
}

const use = await makeUse({
  meta: import.meta,
  specifierResolver: 'npm',
  import: modulePath => baseUse(modulePath, importFromHost),
})

for (const packageSpecifier of packages) {
  const loaded = await use(packageSpecifier)
  console.log(packageSpecifier, Object.keys(Object(loaded)).join(', '))
}
