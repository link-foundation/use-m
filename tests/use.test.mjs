import path from "path";
import { fileURLToPath } from "url";
import { promises as fs } from 'fs';
// import fetch from 'node-fetch';

import { use as staticUse } from '../src/use-module.mjs';

describe(`'use' import strategies`, () => {
  test('Direct ESM Import', async () => {
    const use = staticUse;
    const _ = await use("lodash@4.17.21");
    const result = _.add(2, 3);
    expect(result).toBe(5);
  });

  // test('Dynamic ESM Import', async () => {
  //   const { use } = await import('../src/use-module.mjs');
  //   const _ = await use("lodash@4.17.18");
  //   const result = _.add(2, 3);
  //   expect(result).toBe(5);
  // });

  // test('File Read with Eval', async () => {
  //   const use = await fs.readFile('/Users/konard/Desktop/konard/use/src/use.mjs', 'utf8')
  //     .then((code) => eval(code));
  //   const _ = await use("lodash@4.17.18");
  //   const result = _.add(2, 3);
  //   expect(result).toBe(5);
  // });

  // test('Fetch from GitHub with Eval', async () => {
  //   const use = await fetch('https://raw.githubusercontent.com/konard/use/refs/heads/main/src/use.mjs')
  //     .then((response) => response.text())
  //     .then((code) => eval(code));
  //   const _ = await use("lodash@4.17.18");
  //   const result = _.add(2, 3);
  //   expect(result).toBe(5);
  // });
});