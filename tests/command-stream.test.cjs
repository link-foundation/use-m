const { describe, test, expect } = require('@jest/globals');

const moduleName = `[${__filename.split('.').pop()} module]`;

describe(`${moduleName} command-stream module import`, () => {
  test(`${moduleName} Direct CJS Require`, async () => {
    const { use } = require('use-m');
    const { $ } = await use('command-stream');
    
    expect($).toBeDefined();
    expect($).not.toBe(undefined);
    expect(typeof $).toBe('function');
  });

  test(`${moduleName} Dynamic Import with await import() of CJS`, async () => {
    const { use } = await import('use-m/use.cjs');
    const { $ } = await use('command-stream');
    
    expect($).toBeDefined();
    expect($).not.toBe(undefined);
    expect(typeof $).toBe('function');
  });

  test(`${moduleName} Dynamic Import with await import() of MJS`, async () => {
    const { use } = await import('use-m/use.mjs');
    const { $ } = await use('command-stream');
    
    expect($).toBeDefined();
    expect($).not.toBe(undefined);
    expect(typeof $).toBe('function');
  });
});