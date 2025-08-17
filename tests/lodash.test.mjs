import { describe, test, expect } from '../test-adapter.mjs';
import { use } from 'use-m';
const moduleName = `[${import.meta.url.split('.').pop()} module]`;

describe(`${moduleName} 'lodash' imports tests`, () => {
  test(`${moduleName} npm: lodash`, async () => {
    const _ = await use("lodash");
    expect(_.add(2, 3)).toBe(5);
  });

  test(`${moduleName} npm: lodash@latest`, async () => {
    const _ = await use("lodash@latest");
    expect(_.add(2, 3)).toBe(5);
  });

  test(`${moduleName} npm: lodash@`, async () => {
    const _ = await use("lodash@");
    expect(_.add(2, 3)).toBe(5);
  });

  test(`${moduleName} npm: lodash@4.17.21`, async () => {
    const _ = await use("lodash@4.17.21");
    expect(_.add(2, 3)).toBe(5);
  });

  test(`${moduleName} npm: lodash@4.17.21/add`, async () => {
    const add = await use("lodash@4.17.21/add");
    expect(add(2, 3)).toBe(5);
  });

  test(`${moduleName} npm: lodash@4.17.21/add.js`, async () => {
    const add = await use("lodash@4.17.21/add.js");
    expect(add(2, 3)).toBe(5);
  });

  test(`${moduleName} npm: lodash@4.17.21/not-found.js`, async () => {
    if (typeof Deno !== "undefined") {
      await expect(use("lodash@4.17.21/not-found.js")).rejects.toThrow("Failed to import module from 'https://esm.sh/lodash@4.17.21/not-found.js'");
    } else {
      await expect(use("lodash@4.17.21/not-found.js")).rejects.toThrow("Failed to resolve the path to 'lodash@4.17.21/not-found.js'");
    }
  });
});