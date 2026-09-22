#!/usr/bin/env node
// scripts/sync-root-entries.mjs
//
// Regenerates the root-level use.js / use.cjs / use.mjs entry files from their
// canonical sources in src/. These root mirrors exist ONLY so the historical
// CDN bootstrap URLs keep resolving after the 8.14.0 move to src/:
//
//   https://unpkg.com/use-m/use.js              (fetch + eval)
//   https://unpkg.com/use-m/use.mjs             (await import)
//   https://cdn.jsdelivr.net/npm/use-m/use.cjs  (require / fetch + eval)
//
// unpkg and jsdelivr serve raw published files and ignore package.json
// "exports", so a bare URL like /use-m/use.js can only resolve if a real file
// lives at the package root. The mirrors are full copies (not thin
// `require('./src/use.js')` shims) because the long-standing bootstrap fetches
// and eval()s use.js directly, and a require/import shim cannot work in an eval
// context (`require` is undefined and the relative base is the caller, not
// use-m). See https://github.com/link-foundation/use-m/issues/60.
//
// src/ stays the single source of truth. Run `npm run sync:entries` after
// editing any src/use.* file; tests/root-entries.test.mjs enforces that the
// committed root mirrors stay in sync.

import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// The entry files that must be mirrored from src/ to the package root.
export const ROOT_ENTRIES = ['use.js', 'use.cjs', 'use.mjs'];

// A short generated-file banner, prepended to every mirror so anyone reading it
// (including on a CDN) knows where the real source lives. `{name}` is replaced
// with the file's basename.
const HEADER_TEMPLATE = [
  '// AUTO-GENERATED — do not edit. This is a root-level mirror of src/{name},',
  '// published so the historical CDN URL https://unpkg.com/use-m/{name} keeps',
  '// resolving (unpkg/jsdelivr ignore package.json "exports"). The canonical',
  '// source is src/{name}; edit it and run `npm run sync:entries`. See',
  '// https://github.com/link-foundation/use-m/issues/60.',
].join('\n');

// The repository root, derived from this script's location (scripts/..).
export const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Build the exact contents of a root mirror from its src/ source. This is the
 * single authority for what a mirror should contain; the sync test compares the
 * committed file against the output of this function.
 *
 * @param {string} srcContent contents of src/<basename>
 * @param {string} basename e.g. "use.js"
 * @returns {string}
 */
export function renderRootEntry(srcContent, basename) {
  const header = HEADER_TEMPLATE.replaceAll('{name}', basename);
  return `${header}\n${srcContent}`;
}

/** Read a src/ entry's contents. */
export async function readSrcEntry(basename) {
  return readFile(path.join(repoRoot, 'src', basename), 'utf8');
}

/** Render the expected root mirror contents for a basename. */
export async function buildRootEntry(basename) {
  return renderRootEntry(await readSrcEntry(basename), basename);
}

async function main() {
  for (const basename of ROOT_ENTRIES) {
    const content = await buildRootEntry(basename);
    await writeFile(path.join(repoRoot, basename), content);
    console.log(`synced root ${basename} (${content.length} bytes) from src/${basename}`);
  }
}

// Run main() only when executed directly, not when imported by the sync test.
const invokedDirectly =
  typeof process !== 'undefined' &&
  Array.isArray(process.argv) &&
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
