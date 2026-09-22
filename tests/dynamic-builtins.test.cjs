const { describe, test, expect } = require('../src/test-adapter.cjs');
const { use, resolvers } = require('../src/use.cjs');
const { builtinModules, isBuiltin } = require('node:module');
const moduleName = `[${__filename.split('.').pop()} module]`;

describe(`${moduleName} Dynamic built-in module detection`, () => {
  // These modules never appeared in the old hardcoded list, so they only load
  // because the resolver asks the runtime what is built in (issue #50).
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

  test(`${moduleName} node:tty should work with prefix`, async () => {
    const tty = await use('node:tty');

    expect(tty).toBeDefined();
    expect(typeof tty.isatty).toBe('function');
  });

  test(`${moduleName} subpath built-ins should work (dns/promises, stream/promises)`, async () => {
    const dnsPromises = await use('dns/promises');
    expect(dnsPromises).toBeDefined();
    expect(typeof dnsPromises.lookup).toBe('function');

    const streamPromises = await use('stream/promises');
    expect(streamPromises).toBeDefined();
    expect(typeof streamPromises.pipeline).toBe('function');
  });

  test(`${moduleName} every built-in reported by node:module should be claimed by the builtin resolver`, async () => {
    // The point of issue #50: the supported set is whatever the runtime reports,
    // never a list kept in use-m. A claimed module either resolves or throws a
    // load error; what matters is that the resolver does not hand it off to the
    // npm/CDN resolvers by returning null.
    const unclaimed = [];
    for (const name of builtinModules) {
      const result = await resolvers.builtin(name).catch(error => error);
      if (result === null) {
        unclaimed.push(name);
      }
    }

    expect(unclaimed).toEqual([]);
  });

  test(`${moduleName} prefix-only built-ins should not shadow npm packages of the same name`, async () => {
    // Some built-ins ('node:test', 'node:sqlite') are only built-in when the
    // prefix is used. use-m follows the runtime's own answer, so wherever the
    // bare name is not built-in it has to stay an npm package name.
    for (const name of ['test', 'sqlite']) {
      if (isBuiltin(`node:${name}`) && !isBuiltin(name)) {
        expect(await resolvers.builtin(name)).toBeNull();
      }
    }
  });

  test(`${moduleName} unknown module names should not be claimed as built-ins`, async () => {
    expect(await resolvers.builtin('definitely-not-a-builtin-module')).toBeNull();
    expect(await resolvers.builtin('lodash')).toBeNull();
  });
});
