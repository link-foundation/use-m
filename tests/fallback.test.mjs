import { describe, test, expect } from '../src/test-adapter.mjs';
import { loadWithFallback, makeUse, networkResolverChain, denoResolverChain } from 'use-m';

const moduleName = `[${import.meta.url.split('.').pop()} module]`;

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

  // Issue #81: the aggregated error used to keep only each attempt's message,
  // so a wrapper such as "Failed to import module from '...'" hid the real
  // failure carried in its `cause`, and the original errors were dropped.
  test(`${moduleName} keeps every attempt's error as data and names its causes`, async () => {
    const root = new TypeError("The argument 'filename' must be a file URL object. Received 'shelljs'");
    root.code = 'ERR_INVALID_ARG_VALUE';
    const wrapped = new Error("Failed to import module from 'https://esm.sh/x'.", { cause: root });
    const plain = new Error('mirror down');
    let thrown;
    try {
      await loadWithFallback(['esm', 'jspm'], async (source) => {
        throw source === 'esm' ? wrapped : plain;
      }, { label: 'import x' });
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeInstanceOf(Error);
    expect(thrown.name).toBe('AggregateError');
    expect(Array.isArray(thrown.errors)).toBe(true);
    expect(thrown.errors.length).toBe(2);
    expect(thrown.errors[0] === wrapped).toBe(true);
    expect(thrown.errors[0].cause === root).toBe(true);
    expect(thrown.errors[1] === plain).toBe(true);
    expect(thrown.message).toContain(
      "esm (attempt 1/1): Failed to import module from 'https://esm.sh/x'.\n" +
      "      caused by: TypeError [ERR_INVALID_ARG_VALUE]: The argument 'filename' must be a file URL object. Received 'shelljs'\n" +
      '  - jspm (attempt 1/1): mirror down'
    );
  });

  test(`${moduleName} lists a nested cause chain and stops at a cycle`, async () => {
    const deepest = new RangeError('line one\nline two');
    const middle = new Error('middle', { cause: deepest });
    const top = new Error('top', { cause: middle });
    const cyclic = new Error('cyclic');
    cyclic.cause = cyclic;
    let thrown;
    try {
      await loadWithFallback(['a', 'b', 'c'], async (source) => {
        if (source === 'a') throw top;
        if (source === 'b') throw cyclic;
        throw 'a string, not an Error';
      });
    } catch (error) {
      thrown = error;
    }
    expect(thrown.message).toContain(
      'a (attempt 1/1): top\n' +
      '      caused by: Error: middle\n' +
      '      caused by: RangeError: line one\n' +
      '      line two\n' +
      '  - b (attempt 1/1): cyclic\n' +
      '  - c (attempt 1/1): a string, not an Error'
    );
    expect(thrown.errors.length).toBe(3);
    expect(thrown.errors[2]).toBe('a string, not an Error');
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

  test(`${moduleName} keeps why each mirror failed when every mirror fails (issue #81)`, async () => {
    const use = await makeUse({
      specifierResolvers: ['esm', 'jspm'],
      import: async (url) => {
        const root = new TypeError(`cannot build ${url}`);
        root.code = 'ERR_INVALID_ARG_VALUE';
        throw new Error(`Failed to import module from '${url}'.`, { cause: root });
      },
    });
    let thrown;
    try {
      await use('command-stream@0.0.5');
    } catch (error) {
      thrown = error;
    }
    expect(thrown.name).toBe('AggregateError');
    expect(thrown.errors.map((error) => error.cause.message)).toEqual([
      'cannot build https://esm.sh/command-stream@0.0.5',
      'cannot build https://jspm.dev/command-stream@0.0.5',
    ]);
    expect(thrown.message).toContain(
      'caused by: TypeError [ERR_INVALID_ARG_VALUE]: cannot build https://esm.sh/command-stream@0.0.5'
    );
    expect(thrown.message).toContain(
      'caused by: TypeError [ERR_INVALID_ARG_VALUE]: cannot build https://jspm.dev/command-stream@0.0.5'
    );
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

  test(`${moduleName} Deno keeps loading from esm.sh when it works`, async () => {
    const calls = [];
    const use = await makeUse({
      specifierResolvers: denoResolverChain,
      import: async url => {
        calls.push(url);
        return { loadedFrom: url };
      },
    });
    expect(await use('command-stream@0.0.5')).toEqual({ loadedFrom: 'https://esm.sh/command-stream@0.0.5' });
    expect(calls).toEqual(['https://esm.sh/command-stream@0.0.5']);
  });

  test(`${moduleName} Deno falls back to native npm when every CDN fails`, async () => {
    const calls = [];
    const use = await makeUse({
      specifierResolvers: denoResolverChain,
      import: async url => {
        calls.push(url);
        if (!url.startsWith('npm:')) throw new Error('CDN build failed');
        return { loadedFrom: url };
      },
    });
    expect(await use('command-stream@0.0.5')).toEqual({ loadedFrom: 'npm:command-stream@0.0.5' });
    expect(calls).toEqual([
      'https://esm.sh/command-stream@0.0.5',
      'https://jspm.dev/command-stream@0.0.5',
      'https://cdn.skypack.dev/command-stream@0.0.5',
      'npm:command-stream@0.0.5',
    ]);
  });

  test(`${moduleName} exposes the default mirror chains`, () => {
    // Distinct CDN hosts so a single outage cannot break network loading.
    expect(networkResolverChain).toEqual(['esm', 'jspm', 'skypack']);
    expect(denoResolverChain).toEqual(['deno', 'jspm', 'skypack', 'denoNpm']);
  });
});

describe(`${moduleName} loadWithFallback signal and redact (issue #80)`, () => {
  test(`${moduleName} starts no attempt once the signal has aborted`, async () => {
    const controller = new AbortController();
    const reason = new Error('cancelled by the caller');
    controller.abort(reason);
    let calls = 0;
    let thrown;
    try {
      await loadWithFallback(['a', 'b'], async () => { calls += 1; }, { signal: controller.signal, maxAttemptsPerSource: 2 });
    } catch (error) {
      thrown = error;
    }
    expect(calls).toBe(0);
    expect(thrown.cause).toBe(reason);
    expect(thrown.errors).toEqual([]);
    expect(thrown.message).toBe(
      'Failed to load from any source: stopped after 0 of 4 planned attempts because Error: cancelled by the caller\nAttempts: none'
    );
  });

  test(`${moduleName} stops retrying when the signal aborts during an attempt`, async () => {
    const controller = new AbortController();
    const calls = [];
    let thrown;
    try {
      await loadWithFallback(['a', 'b'], async (source, attempt) => {
        calls.push(`${source}${attempt}`);
        controller.abort(new Error('deadline'));
        throw new Error('aborted mid-request');
      }, { signal: controller.signal, maxAttemptsPerSource: 3 });
    } catch (error) {
      thrown = error;
    }
    expect(calls).toEqual(['a1']);
    expect(thrown.errors.length).toBe(1);
    expect(thrown.message).toContain('stopped after 1 of 6 planned attempts because Error: deadline');
    expect(thrown.message).toContain('  - a (attempt 1/3): aborted mid-request');
  });

  test(`${moduleName} ends a pending retry delay as soon as the signal aborts`, async () => {
    const controller = new AbortController();
    const started = Date.now();
    const aborter = setTimeout(() => controller.abort(), 50);
    let thrown;
    try {
      await loadWithFallback(['a'], async () => { throw new Error('down'); }, {
        signal: controller.signal, maxAttemptsPerSource: 2, retryDelayMs: 60000,
      });
    } catch (error) {
      thrown = error;
    }
    clearTimeout(aborter);
    expect(Date.now() - started).toBeLessThan(2000);
    expect(thrown.message).toContain('stopped after 1 of 2 planned attempts because AbortError');
  });

  test(`${moduleName} passes each attempt line through redact`, async () => {
    let thrown;
    try {
      await loadWithFallback(['https://secret@host/x'], async () => { throw new Error('no https://secret@host/x'); }, {
        redact: (text) => text.split('secret@').join('***@'),
      });
    } catch (error) {
      thrown = error;
    }
    expect(thrown.message).toContain('  - https://***@host/x (attempt 1/1): no https://***@host/x');
    expect(thrown.message).not.toContain('secret');
    expect(thrown.errors[0].message).toBe('no https://secret@host/x');
  });
});
