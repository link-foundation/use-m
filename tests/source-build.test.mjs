import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, test, expect } from '../src/test-adapter.mjs'
import { buildUseBundles, USE_BUNDLE_PATHS } from '../scripts/build-use-bundles.mjs'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const listFiles = async (directory) => {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = await Promise.all(entries.map(async entry => {
    const entryPath = path.join(directory, entry.name)
    return entry.isDirectory() ? listFiles(entryPath) : [entryPath]
  }))
  return files.flat()
}

describe('source layout and deterministic bundles', () => {
  test('keeps every source file below 1500 lines', async () => {
    const sourceFiles = await listFiles(path.join(repoRoot, 'src'))
    const oversized = []
    for (const file of sourceFiles) {
      const contents = await readFile(file, 'utf8')
      const lines = contents.split(/\r?\n/).length
      if (lines >= 1500) oversized.push(`${path.relative(repoRoot, file)} (${lines})`)
    }
    expect(oversized).toEqual([])
  })

  test('rebuilds every committed root and compatibility bundle byte-for-byte', async () => {
    const expected = await buildUseBundles()
    for (const relativePath of USE_BUNDLE_PATHS) {
      const committed = await readFile(path.join(repoRoot, relativePath), 'utf8')
      expect(committed).toBe(expected.get(relativePath))
    }
  })

  test('keeps root bundles readable and src compatibility bundles compact', async () => {
    for (const basename of ['use.js', 'use.cjs', 'use.mjs']) {
      const rootBundle = await readFile(path.join(repoRoot, basename), 'utf8')
      const compatibilityBundle = await readFile(path.join(repoRoot, 'src', basename), 'utf8')
      expect(rootBundle.split(/\r?\n/).length).toBeGreaterThan(1500)
      expect(compatibilityBundle.split(/\r?\n/).length).toBeLessThan(1500)
      expect(rootBundle).toContain('AUTO-GENERATED — do not edit')
      expect(rootBundle).toContain('const makeUse = async')
    }
  })
})
