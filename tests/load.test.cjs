const { readFile } = require('node:fs').promises;
const { describe, test, expect } = require('../src/test-adapter.cjs');
const { loadUseM, looksLikeUseModule, DEFAULT_SOURCES } = require('../src/load.cjs');

const moduleName = `[${__filename.split('.').pop()} module]`;

// A minimal body that passes looksLikeUseModule and eval()s to an object with a
// `use` function — stands in for the real (tens of KB) use.js module.
const FAKE_MODULE =
  '/* ' + 'x'.repeat(300) + ' */\n' +
  '(() => ({ use: function use() { return "fake-use"; }, all() {} }))()';

// Build a fake fetch Response.
const response = (body, { ok = true, status = 200, statusText = 'OK' } = {}) => ({
  ok,
  status,
  statusText,
  text: async () => body,
});

// A fetch mock that records calls and returns responses from a handler.
function mockFetch(handler) {
  const calls = [];
  const fetch = async (url, options) => {
    calls.push({ url, options });
    return handler(url, options);
  };
  fetch.calls = calls;
  return fetch;
}

describe(`${moduleName} looksLikeUseModule`, () => {
  test(`${moduleName} accepts the real shipped use.js`, async () => {
    const realUseJs = await readFile('src/use.js', 'utf8');
    expect(looksLikeUseModule(realUseJs)).toBe(true);
  });

  test(`${moduleName} accepts a long module-like body`, () => {
    expect(looksLikeUseModule(FAKE_MODULE)).toBe(true);
  });

  test(`${moduleName} rejects common CDN plain-text error bodies`, () => {
    for (const body of [
      'Internal Server Error',
      'Bad Gateway',
      'Service Unavailable',
      'Gateway Timeout',
      'Not Found',
      'Forbidden',
      'Too Many Requests',
      'Cannot find package "use-m"',
    ]) {
      expect(looksLikeUseModule(body)).toBe(false);
    }
  });

  test(`${moduleName} rejects HTML error pages`, () => {
    expect(looksLikeUseModule('<!DOCTYPE html><html><body>502 Bad Gateway</body></html>')).toBe(false);
    expect(looksLikeUseModule('   <html>error</html>')).toBe(false);
  });

  test(`${moduleName} rejects empty, whitespace, short, and non-string input`, () => {
    expect(looksLikeUseModule('')).toBe(false);
    expect(looksLikeUseModule('   \n  ')).toBe(false);
    expect(looksLikeUseModule('use({})')).toBe(false); // too short to be the module
    expect(looksLikeUseModule(null)).toBe(false);
    expect(looksLikeUseModule(undefined)).toBe(false);
    expect(looksLikeUseModule(42)).toBe(false);
  });
});

describe(`${moduleName} DEFAULT_SOURCES`, () => {
  test(`${moduleName} lists unpkg, jsDelivr and esm.sh in priority order`, () => {
    expect(DEFAULT_SOURCES).toEqual([
      'https://unpkg.com/use-m/src/use.js',
      'https://cdn.jsdelivr.net/npm/use-m/src/use.js',
      'https://esm.sh/use-m/src/use.js',
    ]);
  });
});

describe(`${moduleName} loadUseM`, () => {
  test(`${moduleName} resolves the use object from the first working source`, async () => {
    const fetch = mockFetch(() => response(FAKE_MODULE));
    const mod = await loadUseM({ fetch, retryDelayMs: 0 });
    expect(typeof mod.use).toBe('function');
    expect(fetch.calls).toHaveLength(1);
    expect(fetch.calls[0].url).toBe(DEFAULT_SOURCES[0]);
  });

  test(`${moduleName} evaluates the real shipped use.js into a working module`, async () => {
    const realUseJs = await readFile('src/use.js', 'utf8');
    const fetch = mockFetch(() => response(realUseJs));
    const mod = await loadUseM({ fetch, retryDelayMs: 0 });
    expect(typeof mod.use).toBe('function');
    expect(typeof mod.use.all).toBe('function');
  });

  test(`${moduleName} falls back to a later mirror when earlier ones fail`, async () => {
    const fetch = mockFetch((url) => {
      if (url.includes('unpkg.com')) return response('Internal Server Error');
      if (url.includes('jsdelivr.net')) return response('Bad Gateway', { ok: false, status: 502, statusText: 'Bad Gateway' });
      return response(FAKE_MODULE);
    });
    const mod = await loadUseM({ fetch, retryDelayMs: 0, maxAttemptsPerSource: 2 });
    expect(typeof mod.use).toBe('function');
    // 2 failed attempts on unpkg + 2 on jsdelivr + 1 success on esm.sh.
    expect(fetch.calls).toHaveLength(5);
    expect(fetch.calls[fetch.calls.length - 1].url).toBe(DEFAULT_SOURCES[2]);
  });

  test(`${moduleName} retries a flaky source before succeeding`, async () => {
    let attempts = 0;
    const fetch = mockFetch(() => {
      attempts += 1;
      if (attempts < 3) return response('Service Unavailable', { ok: false, status: 503, statusText: 'Service Unavailable' });
      return response(FAKE_MODULE);
    });
    const mod = await loadUseM({ fetch, retryDelayMs: 0, sources: ['https://unpkg.com/use-m/src/use.js'] });
    expect(typeof mod.use).toBe('function');
    expect(attempts).toBe(3);
  });

  // Core regression for issue #58: an error body must surface a clear,
  // actionable error — never the cryptic `SyntaxError: Unexpected identifier`.
  test(`${moduleName} throws a clear aggregated error (not SyntaxError) when every source fails`, async () => {
    const fetch = mockFetch(() => response('Internal Server Error'));
    let thrown;
    try {
      await loadUseM({ fetch, retryDelayMs: 0, maxAttemptsPerSource: 2 });
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeInstanceOf(Error);
    expect(thrown.constructor.name).not.toBe('SyntaxError');
    expect(thrown.message).not.toMatch(/Unexpected identifier/);
    expect(thrown.message).toMatch(/Failed to load use-m from every CDN mirror/);
    // Lists every attempt across every mirror.
    expect(thrown.message).toContain('attempt 1/2');
    expect(thrown.message).toContain('attempt 2/2');
    for (const source of DEFAULT_SOURCES) {
      expect(thrown.message).toContain(source);
    }
  });

  test(`${moduleName} surfaces the HTTP status for non-ok responses`, async () => {
    const fetch = mockFetch(() => response('Bad Gateway', { ok: false, status: 502, statusText: 'Bad Gateway' }));
    await expect(
      loadUseM({ fetch, retryDelayMs: 0, maxAttemptsPerSource: 1, sources: ['https://unpkg.com/use-m/src/use.js'] })
    ).rejects.toThrow(/HTTP 502/);
  });

  test(`${moduleName} rejects when the evaluated module lacks a use function`, async () => {
    // Contains lowercase "use" so it passes looksLikeUseModule, but eval()s to an
    // object without a `use` function.
    const body = '/* not the use module ' + 'y'.repeat(300) + ' */\n({ notExported: 1 })';
    const fetch = mockFetch(() => response(body));
    await expect(
      loadUseM({ fetch, retryDelayMs: 0, maxAttemptsPerSource: 1, sources: ['https://unpkg.com/use-m/src/use.js'] })
    ).rejects.toThrow(/did not export a `use` function/);
  });

  test(`${moduleName} does not let eval errors from a malformed body escape`, async () => {
    // Passes looksLikeUseModule (long, has `use` + syntax) but is not valid JS.
    const malformed = '/* ' + 'a '.repeat(150) + '*/ use Server Error (((';
    const fetch = mockFetch(() => response(malformed));
    let thrown;
    try {
      await loadUseM({ fetch, retryDelayMs: 0, maxAttemptsPerSource: 1, sources: ['https://unpkg.com/use-m/src/use.js'] });
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeInstanceOf(Error);
    expect(thrown.constructor.name).not.toBe('SyntaxError');
    expect(thrown.message).toMatch(/Failed to load use-m/);
  });

  test(`${moduleName} reports a clear error when fetch is unavailable`, async () => {
    // `null` (unlike `undefined`) does not trigger the destructuring default,
    // so it exercises the missing-fetch guard without touching the network.
    await expect(loadUseM({ fetch: null })).rejects.toThrow(/`fetch` is not available/);
  });

  test(`${moduleName} honors a custom evaluate hook`, async () => {
    const sentinel = { use() { return 'custom'; } };
    const fetch = mockFetch(() => response(FAKE_MODULE));
    const mod = await loadUseM({ fetch, retryDelayMs: 0, evaluate: () => sentinel });
    expect(mod).toBe(sentinel);
  });

  test(`${moduleName} times out a hanging request and reports it`, async () => {
    const hangingFetch = (url, options) => new Promise((_, reject) => {
      if (options && options.signal) {
        options.signal.addEventListener('abort', () => {
          const error = new Error('aborted');
          error.name = 'AbortError';
          reject(error);
        });
      }
    });
    await expect(
      loadUseM({ fetch: hangingFetch, timeoutMs: 50, retryDelayMs: 0, maxAttemptsPerSource: 1, sources: ['https://unpkg.com/use-m/src/use.js'] })
    ).rejects.toThrow(/timed out after 50ms/);
  });
});
