import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { describe, test, expect } from '../src/test-adapter.mjs'

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const fixtures = ['library-limited-exports', 'library-with-exports', 'library-without-exports']

function npm(args, cwd) {
  // npm.cmd needs a shell on Windows; use npm's JS entry point on every OS.
  const npmCli = process.env.npm_execpath
  const command = npmCli && npmCli.endsWith('.js') ? process.execPath : 'npm'
  return execFileSync(command, command === process.execPath ? [npmCli, ...args] : args, {
    cwd, encoding: 'utf8', timeout: 20000, shell: process.platform === 'win32' && command === 'npm'
  })
}

describe('package publication policy', () => {
  test('keeps only the root use-m manifest publishable', async () => {
    const { checkPublishablePackages } = await import('../scripts/check-publishable-packages.mjs')
    expect(checkPublishablePackages()).toEqual([{ path: 'package.json', name: 'use-m' }])
  })

  test('rejects a newly publishable nested package', async () => {
    const { checkPublishablePackages } = await import('../scripts/check-publishable-packages.mjs')
    const directory = mkdtempSync(path.join(tmpdir(), 'use-m-policy-'))
    try {
      writeFileSync(path.join(directory, 'package.json'), JSON.stringify({ name: 'use-m', version: '1.0.0' }))
      expect(checkPublishablePackages(directory)).toEqual([{ path: 'package.json', name: 'use-m' }])
      mkdirSync(path.join(directory, 'fixture'))
      writeFileSync(path.join(directory, 'fixture', 'package.json'), JSON.stringify({ name: 'library-with-exports', version: '1.0.0' }))
      expect(() => checkPublishablePackages(directory)).toThrow('Only the root use-m package may be publishable')
    } finally {
      rmSync(directory, { recursive: true, force: true })
    }
  })

  test('installs private fixture tarballs and preserves their exports', async () => {
    const directory = mkdtempSync(path.join(tmpdir(), 'use-m-private-fixtures-'))
    try {
      writeFileSync(path.join(directory, 'package.json'), JSON.stringify({ private: true }))
      const tarballs = fixtures.map(name => {
        const packed = JSON.parse(npm(['pack', '--json', '--ignore-scripts', '--pack-destination', directory], path.join(rootDir, 'bun-issues', name)))
        return path.join(directory, packed[0].filename)
      })
      npm(['install', '--ignore-scripts', '--no-audit', '--no-fund', '--package-lock=false', ...tarballs], directory)
      const requireFixture = createRequire(path.join(directory, 'package.json'))
      for (const name of fixtures) {
        const installed = path.join(directory, 'node_modules', name)
        const manifest = requireFixture(path.join(installed, 'package.json'))
        expect(manifest.private).toBe(true)
        const specifier = name === 'library-limited-exports' ? name : `${name}/test.cjs`
        expect(requireFixture(specifier).testCjs()).toContain('Hello from test.cjs')
        const esm = await import(pathToFileURL(path.join(installed, 'test.mjs')).href)
        expect(esm.testMjs()).toContain('Hello from test.mjs')
      }
    } finally {
      rmSync(directory, { recursive: true, force: true })
    }
  }, 30000)
})
