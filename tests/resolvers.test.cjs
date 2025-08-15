const { jest, describe, test, expect } = require('@jest/globals');

const resolve = require.resolve;
const module = `[${__filename.split('.').pop()} module]`;

jest.setTimeout(10000);

describe(`${module} resolvers tests`, () => {
  const { resolvers } = require('../use.cjs');

  test(`${module} npm resolver resolves package path`, async () => {
    const { npm } = resolvers;
    const packagePath = await npm('lodash@4.17.21', resolve);
    expect(packagePath).toMatch(/node_modules\/lodash-v-4\.17\.21/);
  });

  // Tests for https://github.com/link-foundation/use-m/issues/16 issue

  test(`${module} npm resolver resolves scoped package path for @octokit/core@6.1.5`, async () => {
    const { npm } = resolvers;
    const packagePath = await npm('@octokit/core@6.1.5', resolve);
    expect(packagePath).toMatch(/node_modules\/octokit-core-v-6\.1\.5/);
  });

  test(`${module} npm resolver resolves package path with version`, async () => {
    const { npm } = resolvers;
    const rootPath1 = await npm('yargs@latest', resolve);
    const helpersPath1 = await npm('yargs@latest/helpers', resolve);
    const rootPath2 = await npm('yargs', resolve);
    const helpersPath2 = await npm('yargs/helpers', resolve);
    expect(rootPath1).toBe(rootPath2);
    expect(helpersPath1).toBe(helpersPath2);
  });

  test(`${module} npm resolver resolves yargs/helpers`, async () => {
    const { npm } = resolvers;
    const packagePath = await npm('yargs@17.7.2/helpers', resolve);
    expect(packagePath).toMatch(/node_modules\/yargs-v-17\.7\.2\/helpers/);
  });

  test(`${module} npm resolver resolves yargs@18.0.0/helpers`, async () => {
    const { npm } = resolvers;
    const packagePath = await npm('yargs@18.0.0/helpers', resolve);
    expect(packagePath).toMatch(/node_modules\/yargs-v-18\.0\.0\/helpers/);
  });

  test(`${module} npm resolver resolves yargs@latest/helpers`, async () => {
    const { npm } = resolvers;
    const packagePath = await npm('yargs@latest/helpers', resolve);
    expect(packagePath).toMatch(/node_modules\/yargs-v-latest\/helpers/);
  });

  test(`${module} skypack resolver resolves URL`, async () => {
    const { skypack } = resolvers;
    const resolvedPath = await skypack('lodash@4.17.21');
    expect(resolvedPath).toBe('https://cdn.skypack.dev/lodash@4.17.21');
  });

  test(`${module} skypack resolver resolves subpath`, async () => {
    const { skypack } = resolvers;
    const resolvedPath = await skypack('lodash@4.17.21/add');
    expect(resolvedPath).toBe('https://cdn.skypack.dev/lodash@4.17.21/add');
  });

  test(`${module} jsdelivr resolver resolves URL`, async () => {
    const { jsdelivr } = resolvers;
    const resolvedPath = await jsdelivr('lodash@4.17.21');
    expect(resolvedPath).toBe('https://cdn.jsdelivr.net/npm/lodash-es@4.17.21/lodash.js');
  });

  test(`${module} jsdelivr resolver resolves subpath`, async () => {
    const { jsdelivr } = resolvers;
    const resolvedPath = await jsdelivr('lodash@4.17.21/add');
    expect(resolvedPath).toBe('https://cdn.jsdelivr.net/npm/lodash-es@4.17.21/add.js');
  });

  test(`${module} unpkg resolver resolves URL`, async () => {
    const { unpkg } = resolvers;
    const resolvedPath = await unpkg('lodash@4.17.21');
    expect(resolvedPath).toBe('https://unpkg.com/lodash-es@4.17.21/lodash.js');
  });

  test(`${module} unpkg resolver resolves subpath`, async () => {
    const { unpkg } = resolvers;
    const resolvedPath = await unpkg('lodash@4.17.21/add');
    expect(resolvedPath).toBe('https://unpkg.com/lodash-es@4.17.21/add.js');
  });

  test(`${module} esm resolver resolves URL`, async () => {
    const { esm } = resolvers;
    const resolvedPath = await esm('lodash@4.17.21');
    expect(resolvedPath).toBe('https://esm.sh/lodash@4.17.21');
  });

  test(`${module} esm resolver resolves subpath`, async () => {
    const { esm } = resolvers;
    const resolvedPath = await esm('lodash@4.17.21/add');
    expect(resolvedPath).toBe('https://esm.sh/lodash@4.17.21/add');
  });

  test(`${module} jspm resolver resolves URL`, async () => {
    const { jspm } = resolvers;
    const resolvedPath = await jspm('lodash@4.17.21');
    expect(resolvedPath).toBe('https://jspm.dev/lodash@4.17.21');
  });

  test(`${module} jspm resolver resolves subpath`, async () => {
    const { jspm } = resolvers;
    const resolvedPath = await jspm('lodash@4.17.21/add');
    expect(resolvedPath).toBe('https://jspm.dev/lodash@4.17.21/add');
  });

  test(`${module} bun resolver resolves package path`, async () => {
    if (typeof Bun === 'undefined') {
      return;
    }
    const { bun } = resolvers;
    const packagePath = await bun('lodash@4.17.21', resolve);
    expect(packagePath).toMatch(/node_modules\/lodash-v-4\.17\.21/);
  });

  test(`${module} bun resolver resolves yargs/helpers`, async () => {
    if (typeof Bun === 'undefined') {
      return;
    }
    const { bun } = resolvers;
    const packagePath = await bun('yargs@17.7.2/helpers', resolve);
    expect(packagePath).toMatch(/node_modules\/yargs-v-17\.7\.2\/helpers/);
  });

  test(`${module} bun resolver resolves yargs@latest/helpers`, async () => {
    if (typeof Bun === 'undefined') {
      return;
    }
    const { bun } = resolvers;
    const packagePath = await bun('yargs@latest/helpers', resolve);
    expect(packagePath).toMatch(/node_modules\/yargs-v-latest\/helpers/);
  });
});