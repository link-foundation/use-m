import { describe, test, expect } from '@jest/globals';
import { use } from 'use-m';
const runtime = `[${import.meta.url.split('.').pop()} runtime]`;

describe(`${runtime} 'lodash' imports tests`, () => {
  test(`${runtime} npm: lodash`, async () => {
    const _ = await use("lodash");
    expect(_.add(2, 3)).toBe(5);
  });

  test(`${runtime} npm: lodash@latest`, async () => {
    const _ = await use("lodash@latest");
    expect(_.add(2, 3)).toBe(5);
  });

  test(`${runtime} npm: lodash@`, async () => {
    const _ = await use("lodash@");
    expect(_.add(2, 3)).toBe(5);
  });

  test(`${runtime} npm: lodash@4.17.21`, async () => {
    const _ = await use("lodash@4.17.21");
    expect(_.add(2, 3)).toBe(5);
  });

  test(`${runtime} npm: lodash@4.17.21/add`, async () => {
    const add = await use("lodash@4.17.21/add");
    expect(add(2, 3)).toBe(5);
  });

  test(`${runtime} npm: lodash@4.17.21/add.js`, async () => {
    const add = await use("lodash@4.17.21/add.js");
    expect(add(2, 3)).toBe(5);
  });

  test(`${runtime} npm: lodash@4.17.21/not-found.js`, async () => {
    await expect(use("lodash@4.17.21/not-found.js")).rejects.toThrow("Failed to resolve the path to 'lodash@4.17.21/not-found.js'");
  });
});