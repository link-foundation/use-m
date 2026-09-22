import { use, resolvers } from '../src/use.mjs';
import { describe, test, expect } from '../src/test-adapter.mjs';
const moduleName = `[${import.meta.url.split('.').pop()} module]`;

// Every key of the `supportedBuiltins` table that use-m hardcoded up to 8.15.0,
// with the exports each entry promised. Issue #50 replaced that table with
// runtime discovery; nothing listed here may stop working because of it, on any
// runtime the library supports (Node.js, Bun, Deno).
const legacyBuiltinContract = {
  'console': ['log', 'error', 'warn', 'info'],
  'crypto': ['randomUUID'],
  'url': ['URL', 'URLSearchParams'],
  'performance': ['now'],
  'fs': ['readFile', 'writeFile', 'readFileSync', 'writeFileSync', 'existsSync', 'mkdirSync'],
  'fs/promises': ['mkdir', 'writeFile', 'readFile', 'rm'],
  'dns/promises': ['lookup', 'resolve'],
  'stream/promises': ['pipeline', 'finished'],
  'readline/promises': ['createInterface'],
  'timers/promises': ['setTimeout', 'setImmediate'],
  'path': ['join', 'resolve', 'dirname', 'basename', 'extname'],
  'os': ['platform', 'arch', 'hostname', 'tmpdir', 'homedir', 'cpus'],
  'util': ['promisify', 'inspect', 'format'],
  'events': ['EventEmitter'],
  'stream': ['Stream', 'Readable', 'Writable', 'Transform', 'Duplex'],
  'buffer': ['Buffer'],
  'process': ['exit', 'cwd', 'chdir', 'nextTick'],
  'child_process': ['exec', 'execSync', 'spawn', 'spawnSync', 'fork'],
  'http': ['createServer', 'request', 'get', 'Server'],
  'https': ['createServer', 'request', 'get', 'Server'],
  'net': ['createServer', 'createConnection', 'connect', 'Socket', 'Server'],
  'dns': ['lookup', 'resolve', 'reverse'],
  'zlib': ['gzip', 'gunzip', 'deflate', 'inflate', 'gzipSync', 'gunzipSync'],
  'querystring': ['parse', 'stringify'],
  'assert': ['equal', 'deepEqual', 'strictEqual', 'deepStrictEqual']
};

const legacyBuiltinNames = Object.keys(legacyBuiltinContract);

// 'performance' is use-m's own name for the performance object, not a module
// specifier the runtime knows, so it has no namespace to compare against.
const namespaceComparable = legacyBuiltinNames.filter((name) => name !== 'performance');

// Built-ins use-m may rebuild instead of handing back untouched: on Bun and
// Deno the promise file API is reassembled from the callback API, so its
// exports are use-m's own wrappers and cannot be compared by identity.
const rebuiltBuiltins = new Set(['fs/promises']);
const passthroughBuiltins = namespaceComparable.filter((name) => !rebuiltBuiltins.has(name));

describe(`${moduleName} Backward compatibility of previously hardcoded built-ins`, () => {
  for (const [name, exportedNames] of Object.entries(legacyBuiltinContract)) {
    test(`${moduleName} '${name}' still resolves with its documented exports`, async () => {
      for (const specifier of [name, `node:${name}`]) {
        const resolved = await use(specifier);

        expect(resolved).toBeDefined();
        const missing = exportedNames.filter((exportedName) => typeof resolved[exportedName] !== 'function');
        expect({ specifier, missing }).toEqual({ specifier, missing: [] });
      }
    });
  }

  test(`${moduleName} every previously hardcoded built-in is still claimed by the builtin resolver`, async () => {
    // Returning null hands the specifier to the npm/CDN resolvers, which for a
    // built-in name means an install attempt instead of a module.
    const unclaimed = [];
    for (const name of legacyBuiltinNames) {
      for (const specifier of [name, `node:${name}`]) {
        if (await resolvers.builtin(specifier) === null) {
          unclaimed.push(specifier);
        }
      }
    }

    expect(unclaimed).toEqual([]);
  });

  test(`${moduleName} resolved built-ins expose every named export of the runtime's own module`, async () => {
    // The generic loader spreads the runtime's namespace, so nothing the
    // runtime ships may be dropped the way the hardcoded fs/promises table
    // dropped functions it did not list.
    const incomplete = [];
    for (const name of namespaceComparable) {
      const namespace = await import(`node:${name}`);
      const resolved = await use(name);
      const missing = Object.keys(namespace)
        .filter((key) => key !== 'default' && !(key in resolved));
      if (missing.length > 0) {
        incomplete.push(`${name}: ${missing.join(', ')}`);
      }
    }

    expect(incomplete).toEqual([]);
  });

  test(`${moduleName} resolved built-ins keep the runtime's own default export`, async () => {
    // `use('events').default` has been EventEmitter, `use('stream').default`
    // Stream and `use('assert').default` the assert function since the
    // hardcoded table; all three are the module's own default export.
    const mismatched = [];
    for (const name of passthroughBuiltins) {
      const namespace = await import(`node:${name}`);
      if (!('default' in namespace)) {
        continue;
      }
      const resolved = await use(name);
      if (resolved.default !== namespace.default) {
        mismatched.push(name);
      }
    }

    expect(mismatched).toEqual([]);
  });

  test(`${moduleName} 'events' and 'stream' keep their historical default exports`, async () => {
    const events = await use('events');
    expect(events.default).toBe(events.EventEmitter);

    const stream = await use('stream');
    expect(stream.default).toBe(stream.Stream);
  });

  test(`${moduleName} 'assert' stays callable through its default export`, async () => {
    const assert = await use('assert');
    const assertFn = assert.default || assert;

    expect(typeof assertFn).toBe('function');
    expect(() => assertFn(true)).not.toThrow();
    expect(() => assertFn(false)).toThrow();
  });

  test(`${moduleName} 'process' keeps the properties the Deno-specific branch used to copy`, async () => {
    // The removed Deno branch built this object by hand; the values now come
    // from node:process on every runtime and still have to be the real ones.
    const processModule = await use('process');

    expect(processModule.default).toBe(process);
    expect(processModule.pid).toBe(process.pid);
    expect(processModule.platform).toBe(process.platform);
    expect(processModule.version).toBe(process.version);
    expect(processModule.versions).toBe(process.versions);
    expect(processModule.env).toBe(process.env);
    expect(Array.isArray(processModule.argv)).toBe(true);
    for (const key of ['exit', 'cwd', 'chdir', 'nextTick']) {
      expect(typeof processModule[key]).toBe('function');
    }
    for (const key of ['stdout', 'stderr', 'stdin']) {
      expect(processModule[key]).toBeDefined();
    }
  });

  test(`${moduleName} 'performance' still maps onto the performance object`, async () => {
    // Not a module name: it resolves through node:perf_hooks on the Node side.
    for (const specifier of ['performance', 'node:performance']) {
      const perf = await use(specifier);

      expect(typeof perf.now).toBe('function');
      expect(typeof perf.now()).toBe('number');
      expect(perf.default).toBeDefined();
    }
  });

  test(`${moduleName} rebuilt built-ins keep the full surface of the runtime's module`, async () => {
    // A rebuilt module gets use-m's own `default` object, so the guarantee is
    // that it carries exactly the exports the runtime's module has, both at the
    // top level and under `default`.
    for (const name of rebuiltBuiltins) {
      const namespace = await import(`node:${name}`);
      const resolved = await use(name);
      const expected = Object.keys(namespace).filter((key) => key !== 'default').sort();

      expect(Object.keys(resolved).filter((key) => key !== 'default').sort()).toEqual(expected);
      expect(Object.keys(resolved.default).sort()).toEqual(expected);
    }
  });

  test(`${moduleName} built-ins resolve identically with and without the node: prefix`, async () => {
    for (const name of namespaceComparable) {
      const bare = await use(name);
      const prefixed = await use(`node:${name}`);

      expect(Object.keys(prefixed).sort()).toEqual(Object.keys(bare).sort());
      if (!rebuiltBuiltins.has(name)) {
        expect(prefixed.default).toBe(bare.default);
      }
    }
  });
});
