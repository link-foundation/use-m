const { describe, test, expect } = require('@jest/globals');

const runtime = `[${__filename.split('.').pop()} runtime]`;

const supportsDynamicImport = async () => {
  try {
    await new Function('return import("data:text/javascript,")')();
    return true;
  } catch (e) {
    return false;
  }
};

test(`${runtime} supportsDynamicImport returns true in .cjs file`, async () => {
  expect(await supportsDynamicImport()).toBe(true);
});