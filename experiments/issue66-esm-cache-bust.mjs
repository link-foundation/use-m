import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const root = await mkdtemp(path.join(tmpdir(), 'use-m-issue-66-cache-'))
const packageDirectory = path.join(root, 'fixture-package')
const entryPath = path.join(packageDirectory, 'index.js')

try {
  await mkdir(packageDirectory)
  await writeFile(
    path.join(packageDirectory, 'package.json'),
    JSON.stringify({ type: 'module', main: 'index.js' })
  )
  await writeFile(entryPath, 'export const value = (')

  try {
    await import(pathToFileURL(entryPath))
  } catch (error) {
    console.log('initial import:', error.name, error.code || '', error.message)
  }

  await writeFile(entryPath, 'export const value = 42\n')

  try {
    const repaired = await import(`${pathToFileURL(entryPath).href}?use-m-retry=1`)
    console.log('cache-busted import:', repaired.value)
  } catch (error) {
    console.log('cache-busted import:', error.name, error.code || '', error.message)
  }
} finally {
  await rm(root, { recursive: true, force: true })
}
