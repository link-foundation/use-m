import { describe, test, expect } from '../test-adapter.mjs';
import { use } from 'use-m';
const moduleName = `[${import.meta.url.split('.').pop()} module]`;

describe(`${moduleName} cleanup functionality`, () => {
  test(`${moduleName} cleanup function exists`, async () => {
    expect(typeof use.cleanup).toBe('function');
  });

  test(`${moduleName} cleanup returns proper structure`, async () => {
    const result = await use.cleanup();
    
    // Should have the expected structure
    expect(result).toHaveProperty('cleaned');
    expect(Array.isArray(result.cleaned)).toBe(true);
    
    // Should have environment info unless skipped
    if (!result.skipped) {
      expect(result).toHaveProperty('environment');
      expect(['npm', 'bun'].includes(result.environment)).toBe(true);
    }
  }, 15000);

  test(`${moduleName} cleanup in browser/deno should skip`, async () => {
    // Mock browser environment by temporarily removing process
    const originalProcess = global.process;
    const originalBun = global.Bun;
    
    delete global.process;
    delete global.Bun;
    
    try {
      const result = await use.cleanup();
      expect(result.skipped).toBeDefined();
      expect(result.skipped).toBe('Browser/Deno environment does not require cleanup');
    } finally {
      // Restore original globals
      global.process = originalProcess;
      global.Bun = originalBun;
    }
  });

  test(`${moduleName} cleanup handles empty directories gracefully`, async () => {
    // This test ensures cleanup doesn't fail when there are no packages to clean
    const result = await use.cleanup();
    
    // Should not throw an error even if no packages are found
    expect(result).toHaveProperty('cleaned');
    expect(Array.isArray(result.cleaned)).toBe(true);
  }, 15000);
});