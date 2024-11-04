const path = require("path");
const { promises: fs } = require("fs");

describe(`'use' import strategies (CJS)`, () => {
  test('Direct CJS Require', async () => {
    const { use } = require('../src/use-module.cjs');
    const _ = await use("lodash@4.17.21");
    const result = _.add(2, 3);
    expect(result).toBe(5);
  });

  test('File Read with Eval', async () => {
    const code = await fs.readFile(path.resolve(__dirname, '../src/use.cjs'), 'utf8');
    const use = eval(code); // Ensure the code evaluates as expected
    const _ = await use("lodash@4.17.21");
    const result = _.add(2, 3);
    expect(result).toBe(5);
  });

  test('Fetch from GitHub with Eval', async () => {
    const response = await fetch('https://raw.githubusercontent.com/konard/use/refs/heads/main/src/use.cjs');
    const code = await response.text();
    const use = eval(code);
    const _ = await use("lodash@4.17.21");
    const result = _.chunk([1, 2, 3, 4, 5], 2);
    expect(result).toEqual([[1, 2], [3, 4], [5]]);
  });
});