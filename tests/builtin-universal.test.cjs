const { describe, test, expect } = require('@jest/globals');
const { use } = require('../use.cjs');
const runtime = `[${__filename.split('.').pop()} runtime]`;

describe(`${runtime} Universal built-in modules (work in all environments)`, () => {
  test(`${runtime} console module should work`, async () => {
    const consoleModule = await use('console');
    
    expect(consoleModule).toBeDefined();
    expect(typeof consoleModule.log).toBe('function');
    expect(typeof consoleModule.error).toBe('function');
    expect(typeof consoleModule.warn).toBe('function');
    expect(typeof consoleModule.info).toBe('function');
  });

  test(`${runtime} crypto module should work`, async () => {
    const crypto = await use('crypto');
    
    expect(crypto).toBeDefined();
    expect(typeof crypto.randomUUID).toBe('function');
    
    // Test that randomUUID actually works
    const uuid = crypto.randomUUID();
    expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  });

  test(`${runtime} url module should work`, async () => {
    const url = await use('url');
    
    expect(url).toBeDefined();
    expect(typeof url.URL).toBe('function');
    expect(typeof url.URLSearchParams).toBe('function');
    
    // Test URL constructor
    const testUrl = new url.URL('https://example.com/path?query=value');
    expect(testUrl.href).toBe('https://example.com/path?query=value');
    expect(testUrl.hostname).toBe('example.com');
    expect(testUrl.pathname).toBe('/path');
    
    // Test URLSearchParams
    const params = new url.URLSearchParams('a=1&b=2');
    expect(params.get('a')).toBe('1');
    expect(params.get('b')).toBe('2');
  });

  test(`${runtime} performance module should work`, async () => {
    const perf = await use('performance');
    
    expect(perf).toBeDefined();
    expect(typeof perf.now).toBe('function');
    
    // Test that performance.now() returns a number
    const time = perf.now();
    expect(typeof time).toBe('number');
    expect(time).toBeGreaterThan(0);
  });

  test(`${runtime} modules should work with node: prefix`, async () => {
    const url = await use('node:url');
    
    expect(url).toBeDefined();
    expect(typeof url.URL).toBe('function');
    expect(typeof url.URLSearchParams).toBe('function');
    
    // Should work the same as without prefix
    const testUrl = new url.URL('https://example.com');
    expect(testUrl.href).toBe('https://example.com/');
  });
});