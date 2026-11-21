import { createRequire } from 'node:module';
import { describe, expect, test } from '../src/test-adapter.mjs';
import * as esm from 'use-m';

const require = createRequire(import.meta.url);
const cjs = require('use-m');
const callFromCommonJS = require('./fixtures/resolver-caller.cjs');
const fixture = './fixtures/module-shape/named-exports.mjs';

for (const [format, api] of [['ESM', esm], ['CommonJS', cjs]]) {
  describe(`${format} priority resolvers`, () => {
    test('runs resolver and import attempts in order and stops on success', async () => {
      const calls = [];
      const load = await api.makeUse({
        specifierResolver: 'esm',
        resolverChain: [
          () => { calls.push('null'); return null; },
          async () => { calls.push('undefined'); },
          () => { calls.push('resolve failure'); throw new Error('unavailable'); },
          () => { calls.push('resolve missing'); return 'test:missing'; },
          async () => { calls.push('resolve found'); return new URL('test:found'); },
          () => { calls.push('too late'); return 'test:late'; },
        ],
        import: async url => {
          calls.push(url);
          if (url === 'test:missing') throw new Error('missing');
          return false;
        },
      });
      expect(await load('fixture')).toBe(false);
      expect(calls).toEqual([
        'null', 'undefined', 'resolve failure', 'resolve missing', 'test:missing',
        'resolve found', 'test:found',
      ]);
    });

    test('can reorder or omit built-in and relative handling', async () => {
      const custom = () => new URL(fixture, import.meta.url);
      const customFirst = await api.makeUse({ resolverChain: [custom, 'builtin', 'relative'] });
      const nativeFirst = await api.makeUse({ resolverChain: ['builtin', 'relative', custom] });
      const customOnly = await api.makeUse({ resolverChain: [custom] });

      expect((await customFirst('node:path')).named).toBe('named');
      expect(typeof (await nativeFirst('node:path')).join).toBe('function');
      expect((await nativeFirst(fixture, import.meta.url)).named).toBe('named');
      expect((await nativeFirst('./missing-fixture.mjs', import.meta.url)).named).toBe('named');
      expect((await customOnly('./missing-fixture.mjs')).named).toBe('named');
    });

    test('provides the caller URL and options on every attempt', async () => {
      const pathResolver = value => value;
      const seen = [];
      const load = await api.makeUse({
        resolverChain: [
          (specifier, resolvePath, options, { parentURL }) => {
            seen.push([specifier, resolvePath, options.mode, parentURL]);
            return undefined;
          },
          (specifier, resolvePath, options, { parentURL }) => {
            seen.push([specifier, resolvePath, options.mode, parentURL]);
            return new URL(fixture, parentURL);
          },
        ],
        pathResolver,
        mode: 'default',
      });

      expect((await load('from-stack')).named).toBe('named');
      const otherParent = new URL('./other-script.mjs', import.meta.url).href;
      expect((await load('from-options', { parentURL: otherParent, mode: 'override' })).named).toBe('named');
      expect(seen).toEqual([
        ['from-stack', pathResolver, 'default', import.meta.url],
        ['from-stack', pathResolver, 'default', import.meta.url],
        ['from-options', pathResolver, 'override', otherParent],
        ['from-options', pathResolver, 'override', otherParent],
      ]);
    });

    test('reports each attempted resolver when the chain is exhausted', async () => {
      const failure = new Error('resolver failed');
      const load = await api.makeUse({
        resolverChain: ['builtin', 'relative', 'toString', function broken() { throw failure; }],
      });
      const error = await load('only-available-from-custom').catch(error => error);
      expect(error.name).toBe('AggregateError');
      expect(error.message).toContain("import 'only-available-from-custom' with the configured resolvers");
      expect(error.errors.map(error => error.message)).toEqual([
        "Resolver builtin did not match 'only-available-from-custom'.",
        "Resolver relative did not match 'only-available-from-custom'.",
        "Unknown resolver 'toString'.",
        'resolver failed',
      ]);
      expect(error.errors[3]).toBe(failure);

      const single = await api.makeUse({ resolverChain: [() => undefined], import: async () => 'unexpected' });
      await expect(single('fixture')).rejects.toThrow(/did not match 'fixture'/);
      await expect(api.use('node:path', { resolverChain: [] })).rejects.toThrow(/no sources were provided/);
    });

    test('accepts a priority list on a single call to use()', async () => {
      const loaded = await api.use('alias:fixture', {
        parentURL: import.meta.url,
        resolverChain: [(specifier, resolvePath, options, { parentURL }) => new URL(fixture, parentURL)],
      });
      expect(loaded.named).toBe('named');
    });

    test('resolves installed paths relative to a CommonJS caller', async () => {
      const loaded = await callFromCommonJS(api.use, {
        resolverChain: [(specifier, resolvePath, options, { parentURL }) =>
          createRequire(parentURL).resolve('./module-shape/named-exports.mjs')],
      });
      expect(loaded.named).toBe('named');
    });

    test('supports resolver misses, options, and context with existing package chains', async () => {
      const load = await api.makeUse({
        specifierResolvers: [
          () => null,
          (specifier, resolvePath, options, { parentURL }) => new URL(options.fixture, parentURL),
        ],
        fixture,
      });
      expect((await load('fixture', import.meta.url)).named).toBe('named');
      expect(typeof (await load('node:path')).join).toBe('function');
    });
  });
}
