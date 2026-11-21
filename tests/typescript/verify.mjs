import { execFileSync } from 'node:child_process'
import { cpSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../../', import.meta.url))
const compiler = path.join(root, 'node_modules/typescript/bin/tsc')
const types = path.join(root, 'node_modules/@types')
const directory = mkdtempSync(path.join(tmpdir(), 'use-m-types-'))
const npm = process.env.npm_execpath

function check(label, args) {
  console.log(label)
  try {
    execFileSync(process.execPath, args, { cwd: directory, stdio: 'inherit' })
    return true
  } catch {
    return false
  }
}

try {
  const [{ filename }] = JSON.parse(execFileSync(process.execPath,
    [npm, 'pack', '--ignore-scripts', '--json', '--pack-destination', directory], { cwd: root, encoding: 'utf8' }))
  cpSync(path.join(root, 'tests/fixtures/typescript'), directory, { recursive: true })
  writeFileSync(path.join(directory, 'package.json'), JSON.stringify({ private: true, type: 'module' }))
  execFileSync(process.execPath,
    [npm, 'install', '--ignore-scripts', '--no-audit', '--no-fund', '--prefer-offline', './' + filename],
    { cwd: directory, stdio: 'inherit' })

  const flags = [compiler, '--strict', '--exactOptionalPropertyTypes', '--noEmit', '--target', 'es2022', '--lib', 'es2022', '--typeRoots', types, '--types', 'node']
  const checks = [
    check('TypeScript NodeNext imports and CommonJS requires', [...flags, '--module', 'nodenext', 'consumer.mts', 'consumer.cts', 'runtime.mts', 'runtime.cts']),
    check('TypeScript bundler module resolution', [...flags, '--module', 'esnext', '--moduleResolution', 'bundler', 'consumer.mts']),
  ]
  if (process.features.typescript) {
    checks.push(check('Native TypeScript relative imports from CommonJS', ['runtime.cts']))
    checks.push(check('Native TypeScript relative imports from ESM', ['runtime.mts']))
  }
  if (checks.includes(false)) process.exitCode = 1
} finally {
  rmSync(directory, { recursive: true, force: true })
}
