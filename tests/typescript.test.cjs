const { describe, test, expect } = require('../src/test-adapter.cjs');
const { use } = require('use-m');
const moduleName = `[${__filename.split('.').pop()} module]`;
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
