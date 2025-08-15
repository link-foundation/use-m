import { describe, test, expect } from '@jest/globals';

const runtime = `[${import.meta.url.split('.').pop()} runtime]`;

const supportsDynamicImport = async () => {
  try {
    await new Function('return import("data:text/javascript,")')();
    return true;
  } catch (e) {
    return false;
  }
};

test(`${runtime} supportsDynamicImport returns true in .mjs file`, async () => {
  expect(await supportsDynamicImport()).toBe(true);
});