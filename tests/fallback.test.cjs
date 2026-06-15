const { describe, test, expect } = require('../src/test-adapter.cjs');
const { loadWithFallback, makeUse, networkResolverChain, denoResolverChain } = require('use-m');

const moduleName = `[${__filename.split('.').pop()} module]`;

// A resolver/loader recorder: each call appends to `calls` so tests can assert
// the exact order sources were tried in.
const recorder = () => {
  const calls = [];
  return { calls, mark: (tag) => calls.push(tag) };
};

describe(`${moduleName} loadWithFallback (shared engine)`, () => {
  test(`${moduleName} returns the first source's result without trying later ones`, async () => {
    const { calls, mark } = recorder();
    const result = await loadWithFallback(['a', 'b', 'c'], async (source) => {
      mark(source);
      return `loaded:${source}`;
    });
    expect(result).toBe('loaded:a');
    expect(calls).toEqual(['a']);
  });

  test(`${moduleName} falls back to a later source when earlier ones fail`, async () => {
    const { calls, mark } = recorder();
    const result = await loadWithFallback(['a', 'b', 'c'], async (source) => {
      mark(source);
      if (source !== 'c') throw new Error(`down: ${source}`);
      return `loaded:${source}`;
    });
    expect(result).toBe('loaded:c');
    expect(calls).toEqual(['a', 'b', 'c']);
  });

  test(`${moduleName} retries a flaky source before succeeding`, async () => {
    let attempts = 0;
    const result = await loadWithFallback(
      ['only'],
      async () => {
        attempts += 1;
        if (attempts < 3) throw new Error('flaky');
        return 'ok';
      },
      { maxAttemptsPerSource: 3, retryDelayMs: 0 }
    );
    expect(result).toBe('ok');
    expect(attempts).toBe(3);
  });

  test(`${moduleName} throws ONE aggregated error listing every attempt`, async () => {
    let thrown;
    try {
      await loadWithFallback(
        ['x', 'y'],
        async (source) => { throw new Error(`boom ${source}`); },
        {
          maxAttemptsPerSource: 2,
          retryDelayMs: 0,
          label: 'do the thing',
          hint: 'please retry later',
          describeSource: (source) => `src(${source})`,
        }
      );
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeInstanceOf(Error);
    expect(thrown.message).toMatch(/Failed to do the thing/);
    expect(thrown.message).toContain('please retry later');
    // Every source × every attempt is listed.
    expect(thrown.message).toContain('src(x) (attempt 1/2): boom x');
    expect(thrown.message).toContain('src(x) (attempt 2/2): boom x');
    expect(thrown.message).toContain('src(y) (attempt 1/2): boom y');
    expect(thrown.message).toContain('src(y) (attempt 2/2): boom y');
  });

  test(`${moduleName} rejects empty or non-array sources`, async () => {
    await expect(loadWithFallback([], async () => 1)).rejects.toThrow(/no sources were provided/);
    await expect(loadWithFallback(null, async () => 1)).rejects.toThrow(/no sources were provided/);
  });

  test(`${moduleName} rejects a missing load function`, async () => {
    await expect(loadWithFallback(['a'], null)).rejects.toThrow(/a load function is required/);
  });
});

describe(`${moduleName} makeUse per-package CDN fallback`, () => {
  // A resolver that records its name and maps a specifier to a fake URL.
  const resolverFor = (name, calls) => async (specifier) => {
    calls.push(name);
    return `${name}://${specifier}`;
  };

  test(`${moduleName} falls back to the next mirror when one import fails`, async () => {
    const calls = [];
    const use = await makeUse({
      specifierResolvers: [resolverFor('mirror1', calls), resolverFor('mirror2', calls)],
      import: async (url) => {
        calls.push(`import:${url}`);
        if (url.startsWith('mirror1')) throw new Error('mirror1 unreachable');
        return { loadedFrom: url };
      },
    });
    const mod = await use('lodash@4.17.21');
    expect(mod).toEqual({ loadedFrom: 'mirror2://lodash@4.17.21' });
    expect(calls).toEqual([
      'mirror1',
      'import:mirror1://lodash@4.17.21',
      'mirror2',
      'import:mirror2://lodash@4.17.21',
    ]);
  });

  test(`${moduleName} throws a clear aggregated error when every mirror fails`, async () => {
    const use = await makeUse({
      // Real resolver keys so the message shows actual CDN URLs.
      specifierResolvers: ['esm', 'jspm', 'skypack'],
      import: async (url) => { throw new Error(`down: ${url}`); },
    });
    let thrown;
    try {
      await use('left-pad@1.3.0');
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeInstanceOf(Error);
    expect(thrown.message).toMatch(/Failed to import 'left-pad@1\.3\.0' from any CDN mirror/);
    expect(thrown.message).toContain('esm');
    expect(thrown.message).toContain('jspm');
    expect(thrown.message).toContain('skypack');
    // The underlying per-mirror errors are preserved, not swallowed.
    expect(thrown.message).toContain('down: https://esm.sh/left-pad@1.3.0');
  });

  test(`${moduleName} a single explicit resolver imports directly with its raw error (no aggregation)`, async () => {
    const use = await makeUse({
      specifierResolver: 'esm',
      import: async (url) => { throw new Error(`raw import failure: ${url}`); },
    });
    await expect(use('lodash@4.17.21/x')).rejects.toThrow(
      'raw import failure: https://esm.sh/lodash@4.17.21/x'
    );
    // It must NOT be wrapped in the multi-mirror aggregated message.
    await expect(use('lodash@4.17.21/x')).rejects.not.toThrow(/from any CDN mirror/);
  });

  test(`${moduleName} a single-entry specifierResolvers chain also imports directly`, async () => {
    const calls = [];
    const use = await makeUse({
      specifierResolvers: [resolverFor('only', calls)],
      import: async (url) => ({ loadedFrom: url }),
    });
    const mod = await use('react@18');
    expect(mod).toEqual({ loadedFrom: 'only://react@18' });
    expect(calls).toEqual(['only']);
  });

  test(`${moduleName} exposes the default mirror chains`, () => {
    // Distinct CDN hosts so a single outage cannot break network loading.
    expect(networkResolverChain).toEqual(['esm', 'jspm', 'skypack']);
    expect(denoResolverChain).toEqual(['deno', 'jspm', 'skypack']);
  });
});
