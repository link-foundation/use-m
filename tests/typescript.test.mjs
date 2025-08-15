import { use } from 'use-m';

describe(`[MJS Runtime] typescript`, () => {
  test('[MJS Runtime] use typescript', async () => {
    const ts = await use('typescript');
    expect(ts.version).toBeDefined();
    const tsCode = 'const a: number = 1;';
    const jsCode = ts.transpile(tsCode);
    expect(jsCode).toBe('var a = 1;\n');
  });
});