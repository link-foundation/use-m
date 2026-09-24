// tests/root-entries.test.mjs
//
// Regression guard for issue #60. use-m@8.14.0 moved use.js/use.cjs/use.mjs
// under src/, which 404'd the long-standing CDN bootstrap URL
// https://unpkg.com/use-m/use.js (unpkg/jsdelivr serve raw files and ignore
// package.json "exports"). Consumers eval()'d the 404 body and got a cryptic
// "SyntaxError: Unexpected identifier 'found'".
//
// The fix restores root-level, readable bundles generated from the smaller
// src/use/* fragments. These tests assert the bundles exist, stay in sync with
// their deterministic build, eval/import cleanly, and ship in the npm package.

import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { describe, test, expect } from '../src/test-adapter.mjs';
import {
  ROOT_ENTRIES,
  buildRootEntry,
} from '../scripts/sync-root-entries.mjs';

const moduleName = `[${import.meta.url.split('.').pop()} module]`;
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const readRoot = (basename) => readFile(path.join(repoRoot, basename), 'utf8');
describe(`${moduleName} root entry bundles`, () => {
  test(`${moduleName} builds use.js, use.cjs and use.mjs`, () => {
    expect(ROOT_ENTRIES).toEqual(['use.js', 'use.cjs', 'use.mjs']);
  });

  for (const basename of ['use.js', 'use.cjs', 'use.mjs']) {
    test(`${moduleName} ${basename} exists at the package root`, () => {
      expect(existsSync(path.join(repoRoot, basename))).toBe(true);
    });

    test(`${moduleName} root ${basename} is in sync with its source fragments`, async () => {
      const [rootContent, expected] = await Promise.all([
        readRoot(basename),
        buildRootEntry(basename),
      ]);
      // If this fails, run `npm run build` after editing src/use/.
      expect(rootContent).toBe(expected);
    });
  }

  // The core regression: eval()'ing the root use.js (what the CDN bootstrap
  // does) must yield a working `use` function — never a SyntaxError.
  test(`${moduleName} root use.js eval()s to a working use function`, async () => {
    const source = await readRoot('use.js');
    // eslint-disable-next-line no-eval
    const exported = eval(source);
    expect(typeof exported.use).toBe('function');
    expect(typeof exported.use.all).toBe('function');
    expect(typeof exported.makeUse).toBe('function');
  });

  // The eval'd 404 body that broke consumers must NOT look like the module, so
  // the resilient loader's guard rejects it instead of eval()'ing it.
  test(`${moduleName} the 404 "Not found" body is not a valid module body`, async () => {
    const notFoundBody = 'Not found: /use-m@8.14.0/use.js';
    let syntaxError;
    try {
      // eslint-disable-next-line no-eval
      eval(notFoundBody);
    } catch (error) {
      syntaxError = error;
    }
    // Sanity-check that this is indeed the cryptic failure from the issue, and
    // that the restored mirror is the antidote.
    expect(syntaxError).toBeInstanceOf(SyntaxError);
    const realModule = await readRoot('use.js');
    expect(realModule.length).toBeGreaterThan(notFoundBody.length * 100);
  });

  test(`${moduleName} root use.mjs imports to a working use function`, async () => {
    const mod = await import(pathToFileURL(path.join(repoRoot, 'use.mjs')).href);
    expect(typeof mod.use).toBe('function');
  });

  test(`${moduleName} package.json ships and exports the readable root bundles`, async () => {
    const pkg = JSON.parse(await readFile(path.join(repoRoot, 'package.json'), 'utf8'));
    for (const basename of ROOT_ENTRIES) {
      expect(pkg.files).toContain(basename);
      expect(pkg.files).toContain(`src/${basename}`);
    }
    expect(pkg.main).toBe('use.cjs');
    expect(pkg.exports['.']).toEqual({ import: './use.mjs', require: './use.cjs' });
    expect(pkg.exports['./use.cjs']).toBe('./use.cjs');
    expect(pkg.exports['./use.mjs']).toBe('./use.mjs');
    expect(pkg.exports['./use.js']).toBeUndefined();
  });
});
