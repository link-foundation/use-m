import { describe, test, expect } from '../test-adapter.mjs';

const moduleName = `[${import.meta.url.split('.').pop()} module]`;

describe(`${moduleName} command-stream module import`, () => {
  test(`${moduleName} Direct ESM Import`, async () => {
    const { use } = await import('use-m');
    const { $ } = await use('command-stream');
    
    expect($).toBeDefined();
    expect($).not.toBe(undefined);
    expect(typeof $).toBe('function');
  });

  test(`${moduleName} Dynamic ESM Import of CJS`, async () => {
    const { use } = await import('use-m/use.cjs');
    const { $ } = await use('command-stream');
    
    expect($).toBeDefined();
    expect($).not.toBe(undefined);
    expect(typeof $).toBe('function');
  });

  test(`${moduleName} Dynamic ESM Import of MJS`, async () => {
    const { use } = await import('use-m/use.mjs');
    const { $ } = await use('command-stream');
    
    expect($).toBeDefined();
    expect($).not.toBe(undefined);
    expect(typeof $).toBe('function');
  });
});