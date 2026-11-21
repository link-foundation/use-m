import { readFile } from 'node:fs/promises'
import { use as packageUse } from 'use-m'
import { use as compatibilityUse } from '../src/use.mjs'
import { describe, test } from '../src/test-adapter.mjs'
import { checkCallableNamespace } from './fixtures/module-shape/callable-namespace-checks.mjs'

describe('[mjs module] callable namespaces', () => {
  test('keeps default and named exports in the package entry', () => checkCallableNamespace(packageUse))

  test('keeps default and named exports in the compatibility entry', () => checkCallableNamespace(compatibilityUse))

  for (const entry of ['../use.js', '../src/use.js']) {
    test(`keeps default and named exports when evaluating ${entry}`, async () => {
      const { use } = eval(await readFile(new URL(entry, import.meta.url), 'utf8'))
      await checkCallableNamespace(use)
    })
  }
})
