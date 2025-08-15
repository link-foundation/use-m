import { describe, test, expect } from '@jest/globals';

const moduleName = `[${import.meta.url.split('.').pop()} module]`;

const supportsDynamicImport = async () => {
  try {
    await new Function('return import("data:text/javascript,")')();
    return true;
  } catch (e) {
    return false;
  }
};

test(`${moduleName} supportsDynamicImport returns true in .mjs file`, async () => {
  expect(await supportsDynamicImport()).toBe(true);
});