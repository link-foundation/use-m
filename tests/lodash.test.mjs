import { use } from 'use-m';

describe(`mjs 'lodash' imports tests`, () => {
  test('mjs, npm: lodash', async () => {
    const _ = await use("lodash");
    expect(_.add(2, 3)).toBe(5);
  });

  test('mjs, npm: lodash@latest', async () => {
    const _ = await use("lodash@latest");
    expect(_.add(2, 3)).toBe(5);
  });

  test('mjs, npm: lodash@', async () => {
    const _ = await use("lodash@");
    expect(_.add(2, 3)).toBe(5);
  });

  test('mjs, npm: lodash@4.17.21', async () => {
    const _ = await use("lodash@4.17.21");
    expect(_.add(2, 3)).toBe(5);
  });

  test('mjs, npm: lodash@4.17.21/add', async () => {
    const add = await use("lodash@4.17.21/add");
    expect(add(2, 3)).toBe(5);
  });

  test('mjs, npm: lodash@4.17.21/add.js', async () => {
    const add = await use("lodash@4.17.21/add.js");
    expect(add(2, 3)).toBe(5);
  });

  test('mjs, npm: lodash@4.17.21/not-found.js', async () => {
    await expect(use("lodash@4.17.21/not-found.js")).rejects.toThrow("Failed to resolve the path to 'lodash@4.17.21/not-found.js'");
  });
});