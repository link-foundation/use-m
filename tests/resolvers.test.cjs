describe('resolvers tests', () => {
  const resolvers = require('../src/resolvers.cjs');

  test('npm resolver resolves package path', async () => {
    const { npm } = resolvers;
    const packagePath = await npm('lodash@4.17.21');
    // console.log('npm:', packagePath);
    expect(packagePath).toMatch(/node_modules\/lodash-v4\.17\.21/);
  });

  test('skypack resolver resolves URL', async () => {
    const { skypack } = resolvers;
    const resolvedPath = await skypack('lodash@4.17.21');
    // console.log('skypack:', resolvedPath);
    expect(resolvedPath).toBe('https://cdn.skypack.dev/lodash@4.17.21');
  });

  test('skypack resolver resolves subpath', async () => {
    const { skypack } = resolvers;
    const resolvedPath = await skypack('lodash@4.17.21/add');
    // console.log('skypack (subpath):', resolvedPath);
    expect(resolvedPath).toBe('https://cdn.skypack.dev/lodash@4.17.21/add');
  });

  test('jsdelivr resolver resolves URL', async () => {
    const { jsdelivr } = resolvers;
    const resolvedPath = await jsdelivr('lodash@4.17.21');
    // console.log('jsdelivr:', resolvedPath);
    expect(resolvedPath).toBe('https://cdn.jsdelivr.net/npm/lodash-es@4.17.21/lodash.js');
  });

  test('jsdelivr resolver resolves subpath', async () => {
    const { jsdelivr } = resolvers;
    const resolvedPath = await jsdelivr('lodash@4.17.21/add');
    // console.log('jsdelivr (subpath):', resolvedPath);
    expect(resolvedPath).toBe('https://cdn.jsdelivr.net/npm/lodash-es@4.17.21/add.js');
  });

  test('unpkg resolver resolves URL', async () => {
    const { unpkg } = resolvers;
    const resolvedPath = await unpkg('lodash@4.17.21');
    // console.log('unpkg:', resolvedPath);
    expect(resolvedPath).toBe('https://unpkg.com/lodash-es@4.17.21/lodash.js');
  });

  test('unpkg resolver resolves subpath', async () => {
    const { unpkg } = resolvers;
    const resolvedPath = await unpkg('lodash@4.17.21/add');
    // console.log('unpkg (subpath):', resolvedPath);
    expect(resolvedPath).toBe('https://unpkg.com/lodash-es@4.17.21/add.js');
  });

  test('esm resolver resolves URL', async () => {
    const { esm } = resolvers;
    const resolvedPath = await esm('lodash@4.17.21');
    // console.log('esm:', resolvedPath);
    expect(resolvedPath).toBe('https://esm.sh/lodash@4.17.21');
  });

  test('esm resolver resolves subpath', async () => {
    const { esm } = resolvers;
    const resolvedPath = await esm('lodash@4.17.21/add');
    // console.log('esm (subpath):', resolvedPath);
    expect(resolvedPath).toBe('https://esm.sh/lodash@4.17.21/add');
  });

  test('jspm resolver resolves URL', async () => {
    const { jspm } = resolvers;
    const resolvedPath = await jspm('lodash@4.17.21');
    // console.log('jspm:', resolvedPath);
    expect(resolvedPath).toBe('https://jspm.dev/lodash@4.17.21');
  });

  test('jspm resolver resolves subpath', async () => {
    const { jspm } = resolvers;
    const resolvedPath = await jspm('lodash@4.17.21/add');
    // console.log('jspm (subpath):', resolvedPath);
    expect(resolvedPath).toBe('https://jspm.dev/lodash@4.17.21/add');
  });
});