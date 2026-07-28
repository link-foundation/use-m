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
});
