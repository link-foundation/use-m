import { use } from '../use.mjs';
import { describe, test, expect } from '../test-adapter.mjs';
const moduleName = `[${import.meta.url.split('.').pop()} module]`;

describe(`${moduleName} Dynamic built-in module detection`, () => {
  // Test modules that are now dynamically detected (not in specialBuiltins with explicit node handler)
  test(`${moduleName} tty module should work (dynamically detected)`, async () => {
    const tty = await use('tty');

    expect(tty).toBeDefined();
    expect(typeof tty.isatty).toBe('function');
  });

  test(`${moduleName} cluster module should work (dynamically detected)`, async () => {
    const cluster = await use('cluster');

    expect(cluster).toBeDefined();
    expect(typeof cluster.isMaster === 'boolean' || typeof cluster.isPrimary === 'boolean').toBe(true);
  });

  test(`${moduleName} readline module should work (dynamically detected)`, async () => {
    const readline = await use('readline');

    expect(readline).toBeDefined();
    expect(typeof readline.createInterface).toBe('function');
  });

  test(`${moduleName} string_decoder module should work (dynamically detected)`, async () => {
    const stringDecoder = await use('string_decoder');

    expect(stringDecoder).toBeDefined();
    expect(typeof stringDecoder.StringDecoder).toBe('function');
  });

  test(`${moduleName} timers module should work (dynamically detected)`, async () => {
    const timers = await use('timers');

    expect(timers).toBeDefined();
    expect(typeof timers.setTimeout).toBe('function');
    expect(typeof timers.setInterval).toBe('function');
  });

  test(`${moduleName} worker_threads module should work (dynamically detected)`, async () => {
    const workerThreads = await use('worker_threads');

    expect(workerThreads).toBeDefined();
    expect(typeof workerThreads.Worker).toBe('function');
    expect(typeof workerThreads.isMainThread).toBe('boolean');
  });

  test(`${moduleName} vm module should work (dynamically detected)`, async () => {
    const vm = await use('vm');

    expect(vm).toBeDefined();
    expect(typeof vm.createContext).toBe('function');
    expect(typeof vm.runInContext).toBe('function');
  });

  test(`${moduleName} punycode module should work (dynamically detected)`, async () => {
    const punycode = await use('punycode');

    expect(punycode).toBeDefined();
    expect(typeof punycode.encode).toBe('function');
    expect(typeof punycode.decode).toBe('function');
  });

  // Test with node: prefix
  test(`${moduleName} node:tty should work with prefix`, async () => {
    const tty = await use('node:tty');

    expect(tty).toBeDefined();
    expect(typeof tty.isatty).toBe('function');
  });

  // Test subpath modules that are dynamically detected
  test(`${moduleName} dns/promises should still work (has special handling)`, async () => {
    const dnsPromises = await use('dns/promises');

    expect(dnsPromises).toBeDefined();
    expect(typeof dnsPromises.lookup).toBe('function');
  });

  test(`${moduleName} stream/promises should still work (has special handling for older node)`, async () => {
    const streamPromises = await use('stream/promises');

    expect(streamPromises).toBeDefined();
    expect(typeof streamPromises.pipeline).toBe('function');
  });
});
