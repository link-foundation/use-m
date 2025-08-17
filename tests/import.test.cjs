const { describe, test, expect } = require('../test-adapter.cjs');

const moduleName = `[${__filename.split('.').pop()} module]`;

const supportsDynamicImport = async () => {
  try {
    await new Function('return import("data:text/javascript,")')();
    return true;
  } catch (e) {
    return false;
  }
};

describe(`${moduleName} dynamic import support`, () => {
  test(`${moduleName} supportsDynamicImport returns true in .cjs file`, async () => {
    expect(await supportsDynamicImport()).toBe(true);
  });
});