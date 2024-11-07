const path = require("path");
const { promises: fs } = require("fs");

describe(`'use' import strategies (CJS)`, () => {
  test('Direct CJS Require', async () => {
    const { use } = require('../src/use-m.cjs');
    const _ = await use("lodash@4.17.21");
    const result = _.add(2, 3);
    expect(result).toBe(5);
  });

  // New Test Case: Dynamic import with `await import()` directly
  test('Dynamic Import with await import() of CJS', async () => {
    const { use } = await import(require.resolve('../src/use-m.cjs'));
    const _ = await use("lodash@4.17.21");
    const result = _.add(2, 3);
    expect(result).toBe(5);
  });

  // New Test Case: Dynamic import with `await import()` directly
  test('Dynamic Import with await import() of MJS', async () => {
    const { use } = await import(require.resolve('../src/use-m.mjs'));
    const _ = await use("lodash@4.17.21");
    const result = _.add(2, 3);
    expect(result).toBe(5);
  });

  test('File Read with Eval', async () => {
    const use = await fs.readFile(require.resolve('../src/use.cjs'), 'utf8')
      .then((code) => eval(code));
    const _ = await use("lodash@4.17.21");
    const result = _.add(2, 3);
    expect(result).toBe(5);
  });

  test('File Read with Eval via load-use', async () => {
    const loadUsePath = require.resolve('../src/load-use.cjs');
    const use = await fs.readFile(loadUsePath, 'utf8')
      .then((code) => eval(code)());
    const _ = await use("lodash@4.17.21");
    const result = _.add(2, 3);
    expect(result).toBe(5);
  });

  test('Fetch from GitHub with Eval via load-use', async () => {
    const use = await fetch('https://unpkg.com/use-m/src/load-use.cjs')
      .then((response) => response.text())
      .then((code) => eval(code)());
    const _ = await use("lodash@4.17.21");
    const result = _.add(2, 3);
    expect(result).toBe(5);
  });
});