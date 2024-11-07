describe(`resolvers tests`, () => {
  test('resolves package path', async () => {
    const { npm } = require('../src/resolvers.cjs');
    const packagePath = await npm('lodash@4.17.21');
    console.log(packagePath);
    expect(packagePath).toMatch(/node_modules\/lodash-v4.17.21/);
  });
});