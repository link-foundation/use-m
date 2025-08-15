const { use } = require('use-m');

describe(`[CJS Runtime] typescript`, () => {
  test('[CJS Runtime] use typescript', async () => {
    const ts = await use('typescript');
    expect(ts.version).toBeDefined();
    const tsCode = 'const a: number = 1;';
    const jsCode = ts.transpile(tsCode);
    expect(jsCode).toBe('var a = 1;\n');
  });
});