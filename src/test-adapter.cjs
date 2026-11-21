// Universal test adapter for Jest, Bun, and Deno (CommonJS version)
// This module provides a unified interface for testing across different runtimes

let describe, test, expect, beforeAll, afterAll, beforeEach, afterEach;

// Detect runtime and load appropriate test utilities
if (typeof Deno !== 'undefined') {
  // Deno doesn't support CommonJS, but we'll handle it gracefully
  throw new Error('Deno does not support CommonJS modules. Please use .mjs files for Deno tests.');
} else if (typeof Bun !== 'undefined') {
  // Bun environment
  const bunTest = require('bun:test');
  describe = bunTest.describe;
  test = bunTest.test;
  expect = bunTest.expect;
  beforeAll = bunTest.beforeAll;
  afterAll = bunTest.afterAll;
  beforeEach = bunTest.beforeEach;
  afterEach = bunTest.afterEach;
} else {
  // Node.js/Jest environment
  try {
    const jestGlobals = require('@jest/globals');
    describe = jestGlobals.describe;
    test = jestGlobals.test;
    expect = jestGlobals.expect;
    beforeAll = jestGlobals.beforeAll;
    afterAll = jestGlobals.afterAll;
    beforeEach = jestGlobals.beforeEach;
    afterEach = jestGlobals.afterEach;
  } catch (e) {
    // Fallback for environments where @jest/globals is not available
    describe = global.describe || (() => {});
    test = global.test || global.it || (() => {});
    expect = global.expect || (() => {});
    beforeAll = global.beforeAll || (() => {});
    afterAll = global.afterAll || (() => {});
    beforeEach = global.beforeEach || (() => {});
    afterEach = global.afterEach || (() => {});
  }
}

// Export the test utilities
module.exports = { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach };