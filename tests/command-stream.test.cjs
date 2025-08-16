const { describe, test, expect } = require('@jest/globals');

const moduleName = `[${__filename.split('.').pop()} module]`;

describe(`${moduleName} command-stream module import`, () => {
  test(`${moduleName} Import command-stream and verify $ is defined`, async () => {
    const { use } = require('use-m');
    const { $ } = await use('command-stream');
    
    expect($).toBeDefined();
    expect($).not.toBe(undefined);
    expect(typeof $).toBe('function');
  });

  test(`${moduleName} Import command-stream via dynamic import of CJS`, async () => {
    const { use } = await import('use-m/use.cjs');
    const { $ } = await use('command-stream');
    
    expect($).toBeDefined();
    expect($).not.toBe(undefined);
    expect(typeof $).toBe('function');
  });

  test(`${moduleName} Import command-stream via dynamic import of MJS`, async () => {
    const { use } = await import('use-m/use.mjs');
    const { $ } = await use('command-stream');
    
    expect($).toBeDefined();
    expect($).not.toBe(undefined);
    expect(typeof $).toBe('function');
  });
});