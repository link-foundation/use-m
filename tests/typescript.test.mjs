import { describe, test, expect } from '../src/test-adapter.mjs';
import { use } from 'use-m';
const moduleName = `[${import.meta.url.split('.').pop()} module]`;

describe(`${moduleName} typescript`, () => {
  test(`${moduleName} use typescript`, async () => {
    const ts = await use('typescript');
    expect(ts.version).toBeDefined();
    const tsCode = 'const a: number = 1;';
    const jsCode = ts.transpile(tsCode, { target: ts.ScriptTarget.ES5 });
    expect(jsCode).toContain('var a = 1;');
    expect(jsCode).not.toContain(': number');
  });
});
