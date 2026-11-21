const { use: packageUse } = require('use-m')
const { use: compatibilityUse } = require('../src/use.cjs')
const { describe, test } = require('../src/test-adapter.cjs')

describe('[cjs module] callable namespaces', () => {
  test('keeps default and named exports in the package entry', async () => {
    const { checkCallableNamespace } = await import('./fixtures/module-shape/callable-namespace-checks.mjs')
    await checkCallableNamespace(packageUse)
  })

  test('keeps default and named exports in the compatibility entry', async () => {
    const { checkCallableNamespace } = await import('./fixtures/module-shape/callable-namespace-checks.mjs')
    await checkCallableNamespace(compatibilityUse)
  })
})
