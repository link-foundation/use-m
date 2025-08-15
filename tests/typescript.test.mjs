import { describe, test, expect } from '@jest/globals';
import { use } from 'use-m';
const runtime = `[${import.meta.url.split('.').pop()} runtime]`;

describe(`${runtime} typescript`, () => {
  test(`${runtime} use typescript`, async () => {
    const ts = await use('typescript');
    expect(ts.version).toBeDefined();
    const tsCode = 'const a: number = 1;';
    const jsCode = ts.transpile(tsCode);
    expect(jsCode).toBe('var a = 1;\n');
  });
});