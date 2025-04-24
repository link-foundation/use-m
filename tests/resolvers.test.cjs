const resolve = require.resolve;

describe('resolvers tests', () => {
  const { resolvers } = require('../use.cjs');

  test('npm resolver resolves package path', async () => {
    const { npm } = resolvers;
    const packagePath = await npm('lodash@4.17.21', resolve);
    expect(packagePath).toMatch(/node_modules\/lodash-v-4\.17\.21/);
  });

  // Tests for https://github.com/link-foundation/use-m/issues/16 issue

  test('npm resolver resolves scoped package path', async () => {
    const { npm } = resolvers;
    const packagePath = await npm('@octokit/core@3.5.0', resolve);
    expect(packagePath).toMatch(/node_modules\/octokit-core-v-3\.5\.0/);
  });

  test('npm resolver resolves package path with version', async () => {
    const { npm } = resolvers;
    const rootPath1 = await npm('yargs@latest', resolve);
    const helpersPath1 = await npm('yargs@latest/helpers', resolve);
    const rootPath2 = await npm('yargs', resolve);
    const helpersPat2 = await npm('yargs/helpers', resolve);
    expect(rootPath1).toBe(rootPath2);
    expect(helpersPath1).toBe(helpersPat2);
  });

  test('skypack resolver resolves URL', async () => {
    const { skypack } = resolvers;
    const resolvedPath = await skypack('lodash@4.17.21');
    expect(resolvedPath).toBe('https://cdn.skypack.dev/lodash@4.17.21');
  });

  test('skypack resolver resolves subpath', async () => {
    const { skypack } = resolvers;
    const resolvedPath = await skypack('lodash@4.17.21/add');
    expect(resolvedPath).toBe('https://cdn.skypack.dev/lodash@4.17.21/add');
  });

  test('jsdelivr resolver resolves URL', async () => {
    const { jsdelivr } = resolvers;
    const resolvedPath = await jsdelivr('lodash@4.17.21');
    expect(resolvedPath).toBe('https://cdn.jsdelivr.net/npm/lodash-es@4.17.21/lodash.js');
  });

  test('jsdelivr resolver resolves subpath', async () => {
    const { jsdelivr } = resolvers;
    const resolvedPath = await jsdelivr('lodash@4.17.21/add');
    expect(resolvedPath).toBe('https://cdn.jsdelivr.net/npm/lodash-es@4.17.21/add.js');
  });

  test('unpkg resolver resolves URL', async () => {
    const { unpkg } = resolvers;
    const resolvedPath = await unpkg('lodash@4.17.21');
    expect(resolvedPath).toBe('https://unpkg.com/lodash-es@4.17.21/lodash.js');
  });

  test('unpkg resolver resolves subpath', async () => {
    const { unpkg } = resolvers;
    const resolvedPath = await unpkg('lodash@4.17.21/add');
    expect(resolvedPath).toBe('https://unpkg.com/lodash-es@4.17.21/add.js');
  });

  test('esm resolver resolves URL', async () => {
    const { esm } = resolvers;
    const resolvedPath = await esm('lodash@4.17.21');
    expect(resolvedPath).toBe('https://esm.sh/lodash@4.17.21');
  });

  test('esm resolver resolves subpath', async () => {
    const { esm } = resolvers;
    const resolvedPath = await esm('lodash@4.17.21/add');
    expect(resolvedPath).toBe('https://esm.sh/lodash@4.17.21/add');
  });

  test('jspm resolver resolves URL', async () => {
    const { jspm } = resolvers;
    const resolvedPath = await jspm('lodash@4.17.21');
    expect(resolvedPath).toBe('https://jspm.dev/lodash@4.17.21');
  });

  test('jspm resolver resolves subpath', async () => {
    const { jspm } = resolvers;
    const resolvedPath = await jspm('lodash@4.17.21/add');
    expect(resolvedPath).toBe('https://jspm.dev/lodash@4.17.21/add');
  });
});