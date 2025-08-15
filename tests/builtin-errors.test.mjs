import { describe, test, expect } from '@jest/globals';
import { use } from '../use.mjs';
const runtime = `[${import.meta.url.split('.').pop()} runtime]`;

describe(`${runtime} Built-in module error handling`, () => {
  test(`${runtime} should return null for non-builtin modules from builtin resolver`, async () => {
    const { resolvers } = await import('../use.mjs');
    
    // Test that builtin resolver returns null for non-builtin modules
    const result = await resolvers.builtin('lodash');
    expect(result).toBeNull();
  });

  test(`${runtime} should throw error for unsupported builtin modules`, async () => {
    // Create a module name that looks like a builtin but isn't
    const testFn = async () => {
      const { baseUse } = await import('../use.mjs');
      await baseUse('builtin:unsupported_builtin_module');
    };
    await expect(testFn()).rejects.toThrow('Built-in module \'unsupported_builtin_module\' is not supported');
  });

  test(`${runtime} should handle modules not available in browser environment`, async () => {
    // Mock browser environment
    const originalWindow = global.window;
    global.window = {}; // Mock browser environment
    
    try {
      await expect(use('fs')).rejects.toThrow('Built-in module \'fs\' is not available in browser environment');
    } finally {
      // Restore environment
      if (originalWindow === undefined) {
        delete global.window;
      } else {
        global.window = originalWindow;
      }
    }
  });

  test(`${runtime} should only work with exact lowercase module names`, async () => {
    // Only lowercase should work
    const url = await use('url');
    expect(url).toBeDefined();
    expect(typeof url.URL).toBe('function');
    
    // Uppercase should not be recognized as builtin and fall back to npm resolver
    await expect(use('URL')).rejects.toThrow(); // Should fail to install from npm
  });

  test(`${runtime} should handle node: prefix removal correctly`, async () => {
    const crypto1 = await use('crypto');
    const crypto2 = await use('node:crypto');
    
    expect(crypto1).toBeDefined();
    expect(crypto2).toBeDefined();
    
    // Both should have similar structure
    expect(typeof crypto1.randomUUID).toBe('function');
    expect(typeof crypto2.randomUUID).toBe('function');
  });

  test(`${runtime} should throw meaningful errors for import failures`, async () => {
    // We can't easily test import failures without mocking, but we can test error message structure
    const { baseUse } = await import('../use.mjs');
    
    await expect(baseUse('builtin:nonexistent')).rejects.toThrow('Built-in module \'nonexistent\' is not supported');
  });

  test(`${runtime} builtin resolver should handle empty/invalid module specifiers gracefully`, async () => {
    const { resolvers, parseModuleSpecifier } = await import('../use.mjs');
    
    // parseModuleSpecifier should throw for invalid specifiers
    expect(() => parseModuleSpecifier('')).toThrow();
    expect(() => parseModuleSpecifier(null)).toThrow();
    expect(() => parseModuleSpecifier(undefined)).toThrow();
  });

  test(`${runtime} should handle modules with special characters in names`, async () => {
    const { resolvers } = await import('../use.mjs');
    
    // Test with module that looks like a scoped package
    const result = await resolvers.builtin('@org/package');
    expect(result).toBeNull(); // Should not be recognized as builtin
  });
});