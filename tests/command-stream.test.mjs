import { describe, test, expect } from '@jest/globals';

const moduleName = `[${import.meta.url.split('.').pop()} module]`;

describe(`${moduleName} command-stream module import`, () => {
  test(`${moduleName} Import command-stream via MJS`, async () => {
    const { use } = await import('use-m/use.mjs');
    const { $ } = await use('command-stream');
    
    expect($).toBeDefined();
    expect($).not.toBe(undefined);
    expect(typeof $).toBe('function');
  });

  test(`${moduleName} Import command-stream via CJS from MJS`, async () => {
    const { use } = await import('use-m/use.cjs');
    const { $ } = await use('command-stream');
    
    expect($).toBeDefined();
    expect($).not.toBe(undefined);
    expect(typeof $).toBe('function');
  });

  test(`${moduleName} Import command-stream via default export`, async () => {
    const { use } = await import('use-m');
    const { $ } = await use('command-stream');
    
    expect($).toBeDefined();
    expect($).not.toBe(undefined);
    expect(typeof $).toBe('function');
  });
});