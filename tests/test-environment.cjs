const isBun = typeof Bun !== 'undefined';

let describe, test, expect, beforeAll, afterAll, beforeEach, afterEach, it;
let jest = {};

if (isBun) {
  // Running in Bun - use bun:test
  const bunTest = require('bun:test');
  describe = bunTest.describe;
  test = bunTest.test;
  expect = bunTest.expect;
  beforeAll = bunTest.beforeAll;
  afterAll = bunTest.afterAll;
  beforeEach = bunTest.beforeEach;
  afterEach = bunTest.afterEach;
  it = bunTest.it || bunTest.test;
  
  // Mock jest.setTimeout for Bun
  jest.setTimeout = () => {
    // Bun doesn't have a global timeout setter like Jest
    // Silently ignore timeout settings in Bun
  };
} else {
  // Running in Node/Jest - check if globals are already available
  if (typeof global.describe !== 'undefined') {
    // Jest globals are already available (running with jest command)
    describe = global.describe;
    test = global.test;
    expect = global.expect;
    beforeAll = global.beforeAll;
    afterAll = global.afterAll;
    beforeEach = global.beforeEach;
    afterEach = global.afterEach;
    it = global.it;
    jest = global.jest || {};
  } else {
    // Try to import from @jest/globals (only works within Jest environment)
    try {
      const jestGlobals = require('@jest/globals');
      describe = jestGlobals.describe;
      test = jestGlobals.test;
      expect = jestGlobals.expect;
      beforeAll = jestGlobals.beforeAll;
      afterAll = jestGlobals.afterAll;
      beforeEach = jestGlobals.beforeEach;
      afterEach = jestGlobals.afterEach;
      it = jestGlobals.it;
      jest = jestGlobals.jest;
    } catch (e) {
      // If we can't import @jest/globals, provide stubs
      // This happens when the file is imported outside of Jest
      const noop = () => {};
      describe = noop;
      test = noop;
      expect = noop;
      beforeAll = noop;
      afterAll = noop;
      beforeEach = noop;
      afterEach = noop;
      it = noop;
      jest = { setTimeout: noop };
    }
  }
  
  // Ensure jest.setTimeout exists
  if (!jest.setTimeout) {
    jest.setTimeout = () => {};
  }
}

module.exports = { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach, it, jest, isBun };