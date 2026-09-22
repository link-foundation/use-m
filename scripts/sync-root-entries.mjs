#!/usr/bin/env node

// Backward-compatible command wrapper. Root entries are now built from the
// smaller src/use/* fragments rather than mirrored from monolithic src files.
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  buildUseBundles,
  repoRoot,
  writeUseBundles,
} from './build-use-bundles.mjs'

export const ROOT_ENTRIES = ['use.js', 'use.cjs', 'use.mjs']
export { repoRoot }

export async function buildRootEntry(basename) {
  if (!ROOT_ENTRIES.includes(basename)) {
    throw new Error(`Unknown root entry '${basename}'.`)
  }
  return (await buildUseBundles()).get(basename)
}

const invokedDirectly =
  typeof process !== 'undefined' &&
  Array.isArray(process.argv) &&
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)

if (invokedDirectly) {
  writeUseBundles().catch(error => {
    console.error(error)
    process.exitCode = 1
  })
}
