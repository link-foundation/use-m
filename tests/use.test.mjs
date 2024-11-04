import path from "path";
import { fileURLToPath } from "url";
import { promises as fs } from 'fs';

import { use as staticUse } from '../src/use-module.mjs';

describe(`'use' import strategies`, () => {
  test('Direct ESM Import', async () => {
    const use = staticUse;
    const _ = await use("lodash@4.17.21");
    const result = _.add(2, 3);
    expect(result).toBe(5);
  });

  test('Dynamic ESM Import', async () => {
    const { use } = await import('../src/use-module.mjs');
    const _ = await use("lodash@4.17.21");
    const result = _.add(2, 3);
    expect(result).toBe(5);
  });

  test('File Read with Eval', async () => {
    const __filename = fileURLToPath(import.meta.url); // required for eval to work
    const loadUsePath = path.resolve(path.dirname(__filename), '../src/use.mjs');
    const use = await fs.readFile(loadUsePath, 'utf8')
      .then((code) => eval(code));
    const _ = await use("lodash@4.17.21");
    const result = _.add(2, 3);
    expect(result).toBe(5);
  });

  test('File Read with Eval via load-use', async () => {
    const __filename = fileURLToPath(import.meta.url);
    const loadUsePath = path.resolve(path.dirname(__filename), '../src/load-use.mjs');
    const use = await fs.readFile(loadUsePath, 'utf8')
      .then((code) => eval(code)());
    const _ = await use("lodash@4.17.21");
    const result = _.add(2, 3);
    expect(result).toBe(5);
  });

  test('Fetch from GitHub with Eval', async () => {
    global.__filename = fileURLToPath(import.meta.url); // required for eval to work
    const use = await fetch('https://raw.githubusercontent.com/konard/use/refs/heads/main/src/use.mjs')
      .then((response) => response.text())
      .then((code) => eval(code));
    const _ = await use("lodash@4.17.21");
    const result = _.add(2, 3);
    expect(result).toBe(5);
  });

  test('Fetch from GitHub with Eval via load-use', async () => {
    const use = await fetch('https://raw.githubusercontent.com/konard/use/refs/heads/main/src/load-use.mjs')
      .then((response) => response.text())
      .then((code) => eval(code)());
    const _ = await use("lodash@4.17.21");
    const result = _.add(2, 3);
    expect(result).toBe(5);
  });
});