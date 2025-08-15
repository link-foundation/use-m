const { describe, test, expect } = require('@jest/globals');
const { use } = require('use-m');
const moduleName = `[${__filename.split('.').pop()} module]`;

describe(`${moduleName} typescript`, () => {
  test(`${moduleName} use typescript`, async () => {
    const ts = await use('typescript');
    expect(ts.version).toBeDefined();
    const tsCode = 'const a: number = 1;';
    const jsCode = ts.transpile(tsCode);
    expect(jsCode).toBe('var a = 1;\n');
  });
});