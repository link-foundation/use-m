import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { describe, test, expect } from '../src/test-adapter.mjs';
import { use } from 'use-m';
const moduleName = `[${import.meta.url.split('.').pop()} module]`;
const typescriptSpecifier = typeof Deno === 'undefined' ? 'typescript' : 'typescript@5.9.3';

describe(`${moduleName} typescript`, () => {
  test(
    `${moduleName} use typescript`,
    async () => {
      const ts = await use(typescriptSpecifier);
      expect(ts.version).toMatch(/^\d+\.\d+\.\d+/);
    },
    30_000,
  );

  if (typeof Deno !== 'undefined' || typeof Bun !== 'undefined' || process.features.typescript) {
    for (const filename of ['runtime.mts', 'runtime.cts']) {
      test(`loads a caller-relative TypeScript file from ${filename}`, () => {
        const fixture = fileURLToPath(new URL(`./fixtures/typescript/${filename}`, import.meta.url));
        const args = typeof Deno === 'undefined' ? [fixture] : ['run', '--allow-read', fixture];
        execFileSync(process.execPath, args, { stdio: 'pipe' });
      });
    }
  }
});
