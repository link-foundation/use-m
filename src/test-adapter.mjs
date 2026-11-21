// Universal test adapter for Jest, Bun, and Deno
// This module provides a unified interface for testing across different runtimes

let describe, test, expect, beforeAll, afterAll, beforeEach, afterEach;

// Detect runtime and load appropriate test utilities
if (typeof Deno !== 'undefined') {
  // Deno environment
  const { describe: denoDescribe, it: denoIt, beforeAll: denoBeforeAll, afterAll: denoAfterAll, beforeEach: denoBeforeEach, afterEach: denoAfterEach } = await import('https://deno.land/std@0.224.0/testing/bdd.ts');
  const { expect: denoExpect } = await import('https://deno.land/std@0.224.0/expect/mod.ts');
  
  describe = denoDescribe;
  test = denoIt;
  expect = denoExpect;
  beforeAll = denoBeforeAll || (() => {});
  afterAll = denoAfterAll || (() => {});
  beforeEach = denoBeforeEach || (() => {});
  afterEach = denoAfterEach || (() => {});
} else if (typeof Bun !== 'undefined') {
  // Bun environment
  const bunTest = await import('bun:test');
  describe = bunTest.describe;
  test = bunTest.test;
  expect = bunTest.expect;
  beforeAll = bunTest.beforeAll;
  afterAll = bunTest.afterAll;
  beforeEach = bunTest.beforeEach;
  afterEach = bunTest.afterEach;
} else {
  // Node.js/Jest environment
  const jestGlobals = await import('@jest/globals');
  describe = jestGlobals.describe;
  test = jestGlobals.test;
  expect = jestGlobals.expect;
  beforeAll = jestGlobals.beforeAll;
  afterAll = jestGlobals.afterAll;
  beforeEach = jestGlobals.beforeEach;
  afterEach = jestGlobals.afterEach;
}

// Export the test utilities
export { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach };

// Also export as default for convenience
export default { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach };