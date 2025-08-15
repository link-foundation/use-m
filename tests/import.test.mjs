import { describe, test, expect } from '@jest/globals';

const module = `[${import.meta.url.split('.').pop()} module]`;

const supportsDynamicImport = async () => {
  try {
    await new Function('return import("data:text/javascript,")')();
    return true;
  } catch (e) {
    return false;
  }
};

test(`${module} supportsDynamicImport returns true in .mjs file`, async () => {
  expect(await supportsDynamicImport()).toBe(true);
});