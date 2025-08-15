// Jest compatibility for Bun
import { test, expect, describe, beforeAll, afterAll, beforeEach, afterEach } from "bun:test";

// Make Jest globals available for compatibility
globalThis.test = test;
globalThis.it = test; // alias
globalThis.expect = expect;
globalThis.describe = describe;
globalThis.beforeAll = beforeAll;
globalThis.afterAll = afterAll;
globalThis.beforeEach = beforeEach;
globalThis.afterEach = afterEach;

// Jest-style utilities
globalThis.jest = {
  setTimeout: () => {
    // Bun handles timeouts differently, but we can ignore this for compatibility
  }
};