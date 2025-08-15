const { describe, test, expect } = require('@jest/globals');

const moduleName = `[${__filename.split('.').pop()} module]`;

const supportsDynamicImport = async () => {
  try {
    await new Function('return import("data:text/javascript,")')();
    return true;
  } catch (e) {
    return false;
  }
};

test(`${moduleName} supportsDynamicImport returns true in .cjs file`, async () => {
  expect(await supportsDynamicImport()).toBe(true);
});