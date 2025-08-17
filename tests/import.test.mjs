import { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach } from '../test-adapter.mjs';

const moduleName = `[${import.meta.url.split('.').pop()} module]`;

const supportsDynamicImport = async () => {
  try {
    await new Function('return import("data:text/javascript,")')();
    return true;
  } catch (e) {
    return false;
  }
};

describe(`${moduleName} dynamic import support`, () => {
  test(`${moduleName} supportsDynamicImport returns true in .mjs file`, async () => {
    expect(await supportsDynamicImport()).toBe(true);
  });
});