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
    const use = await fs.readFile(path.resolve(__dirname, '../src/use.cjs'), 'utf8')
      .then((code) => eval(code));
    const _ = await use("lodash@4.17.21");
    const result = _.add(2, 3);
    expect(result).toBe(5);
  });

  test('File Read with Eval via load-use', async () => {
    const loadUsePath = path.resolve(__dirname, '../src/load-use.cjs');
    const use = await fs.readFile(loadUsePath, 'utf8')
      .then((code) => eval(code)());
    const _ = await use("lodash@4.17.21");
    const result = _.add(2, 3);
    expect(result).toBe(5);
  });

  test('Fetch from GitHub with Eval', async () => {
    const use = await fetch('https://raw.githubusercontent.com/konard/use/refs/heads/main/src/use.cjs')
      .then((response) => response.text())
      .then((code) => eval(code));
    const _ = await use("lodash@4.17.21");
    const result = _.add(2, 3);
    expect(result).toBe(5);
  });

  test('Fetch from GitHub with Eval via load-use', async () => {
    const use = await fetch('https://raw.githubusercontent.com/konard/use/refs/heads/main/src/load-use.cjs')
      .then((response) => response.text())
      .then((code) => eval(code)());
    const _ = await use("lodash@4.17.21");
    const result = _.add(2, 3);
    expect(result).toBe(5);
  });
});