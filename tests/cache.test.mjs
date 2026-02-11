import { describe, test, expect } from '../test-adapter.mjs';
import { use } from '../use.mjs';

const moduleName = `[${import.meta.url.split('.').pop()} module]`;

describe(`${moduleName} Module caching functionality`, () => {
  test(`${moduleName} Module cache - same module instance returned on repeated calls`, async () => {
    // Import the same built-in module twice
    const url1 = await use('url');
    const url2 = await use('url');
    
    // Both should return the exact same object reference (cached)
    expect(url1).toBe(url2);
    
    // Both should have the same functionality
    expect(typeof url1.URL).toBe('function');
    expect(typeof url2.URL).toBe('function');
    
    const testUrl1 = new url1.URL('https://example.com');
    const testUrl2 = new url2.URL('https://example.com');
    expect(testUrl1.hostname).toBe(testUrl2.hostname);
  });

  test(`${moduleName} Built-in module cache - same instance for repeated built-in imports`, async () => {
    // Import the same built-in module twice
    const fs1 = await use('fs');
    const fs2 = await use('fs');
    
    // Both should return the exact same object reference (cached)
    expect(fs1).toBe(fs2);
    
    // Both should have expected properties
    expect(typeof fs1.readFile).toBe('function');
    expect(typeof fs2.readFile).toBe('function');
  });

  test(`${moduleName} Different built-in modules are cached separately`, async () => {
    // Import different built-in modules
    const crypto1 = await use('crypto');
    const fs1 = await use('fs');
    
    // They should be different objects 
    expect(crypto1).not.toBe(fs1);
    expect(typeof crypto1.createHash).toBe('function');
    expect(typeof fs1.readFile).toBe('function');
  });

  test(`${moduleName} Cache functionality - same object reference for built-ins`, async () => {
    // Import the same built-in module multiple times
    const crypto1 = await use('crypto');
    const crypto2 = await use('node:crypto');
    const crypto3 = await use('crypto');
    
    // All should return the exact same object reference (cached)
    expect(crypto1).toBe(crypto2);
    expect(crypto2).toBe(crypto3);
    expect(crypto1).toBe(crypto3);
    
    // All should have the same functionality
    const hash1 = crypto1.createHash('sha256').update('test').digest('hex');
    const hash2 = crypto2.createHash('sha256').update('test').digest('hex');
    const hash3 = crypto3.createHash('sha256').update('test').digest('hex');
    expect(hash1).toBe(hash2);
    expect(hash2).toBe(hash3);
  });

  test(`${moduleName} Built-in cache with node: prefix`, async () => {
    // Test caching with node: prefix
    const crypto1 = await use('node:crypto');
    const crypto2 = await use('crypto');
    
    // These should potentially be the same cached object
    expect(typeof crypto1.createHash).toBe('function');
    expect(typeof crypto2.createHash).toBe('function');
    
    // Test that they work
    const hash1 = crypto1.createHash('sha256').update('test').digest('hex');
    const hash2 = crypto2.createHash('sha256').update('test').digest('hex');
    expect(hash1).toBe(hash2);
  });
});