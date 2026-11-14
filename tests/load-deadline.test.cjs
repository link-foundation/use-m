// Deadlines of `loadUseM` against a real loopback HTTP server (issue #80).
//
// `fetch` resolves as soon as the response headers arrive, so a per-attempt
// timeout cleared at that point leaves a body that never finishes unbounded.
// These tests keep the two stalls apart — no headers at all, and headers sent
// at once with a body that never completes — and check the complete-response,
// HTTP-error and mirror-fallback controls, the caller's `signal`, and the
// overall `totalTimeoutMs` deadline. The CommonJS copy runs on Node.js (Jest) and Bun.
const http = require('node:http');
const { describe, test, expect } = require('../src/test-adapter.cjs');
const { loadUseM } = require('../src/load.cjs');

const moduleName = `[${__filename.split('.').pop()} module]`;

// A self-authored stand-in for use.js: long enough to pass
// looksLikeUseModule, and eval()s to an object with a `use` function.
const MODULE =
  '/* ' + 'x'.repeat(300) + ' */\n' +
  '(() => ({ use: function use() { return "loopback-use"; } }))()';

// A stall shows up as a promise that never settles, so every load races a
// guard far above the deadlines under test; hitting it fails the test with a
// clear message instead of a test-runner timeout.
const SETTLE_GUARD_MS = 5000;
// Generous upper bound for "promptly", to stay stable on slow CI machines.
const PROMPT_MS = 2000;

// Serve each test from its own loopback server; every socket is destroyed and
// the server closed afterwards, so nothing outlives the test.
async function withServer(run) {
  const requests = [];
  const sockets = new Set();
  const server = http.createServer((request, response) => {
    requests.push(request.url);
    const path = request.url.split('?')[0];
    if (path === '/complete') {
      response.writeHead(200, { 'content-type': 'text/javascript' });
      response.end(MODULE);
    } else if (path === '/stalled-body') {
      // Headers and the first bytes at once, then the body never completes.
      response.writeHead(200, { 'content-type': 'text/javascript', 'content-length': String(MODULE.length) });
      response.write(MODULE.slice(0, 16));
    } else if (path === '/unavailable') {
      response.writeHead(503, { 'content-type': 'text/plain' });
      response.end('Service Unavailable');
    }
    // '/stalled-headers': never answer at all.
  });
  server.on('connection', (socket) => {
    sockets.add(socket);
    socket.on('close', () => sockets.delete(socket));
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    return await run({ base, requests });
  } finally {
    for (const socket of sockets) socket.destroy();
    await new Promise((resolve) => server.close(resolve));
  }
}

// Wraps the runtime's fetch to record whether each request's signal aborted.
function spyFetch() {
  const signals = [];
  const fetchSpy = (url, init) => {
    signals.push(init && init.signal);
    return fetch(url, init);
  };
  fetchSpy.signals = signals;
  return fetchSpy;
}

// Settles `promise` into { status, value | error, ms }, or { status: 'pending' }
// after SETTLE_GUARD_MS.
async function settle(promise) {
  const started = Date.now();
  let guard;
  const outcome = await Promise.race([
    promise.then(
      (value) => ({ status: 'resolved', value }),
      (error) => ({ status: 'rejected', error })
    ),
    new Promise((resolve) => {
      guard = setTimeout(() => resolve({ status: 'pending' }), SETTLE_GUARD_MS);
    }),
  ]);
  clearTimeout(guard);
  return { ...outcome, ms: Date.now() - started };
}

describe(`${moduleName} loadUseM deadlines on a loopback server`, () => {
  test(`${moduleName} control: a complete response resolves`, async () => {
    await withServer(async ({ base }) => {
      const fetchSpy = spyFetch();
      const result = await settle(loadUseM({
        fetch: fetchSpy, sources: [`${base}/complete`], maxAttemptsPerSource: 1, timeoutMs: 1000,
      }));
      expect(result.status).toBe('resolved');
      expect(result.value.use()).toBe('loopback-use');
      expect(fetchSpy.signals[0].aborted).toBe(false);
    });
  });

  test(`${moduleName} stalled headers: the attempt times out waiting for the headers`, async () => {
    await withServer(async ({ base }) => {
      const fetchSpy = spyFetch();
      const result = await settle(loadUseM({
        fetch: fetchSpy, sources: [`${base}/stalled-headers`], maxAttemptsPerSource: 1, timeoutMs: 100,
      }));
      expect(result.status).toBe('rejected');
      expect(result.ms).toBeLessThan(PROMPT_MS);
      expect(result.error.message).toContain('request timed out after 100ms while waiting for the response headers');
      expect(fetchSpy.signals[0].aborted).toBe(true);
    });
  });

  // The issue #80 regression: headers arrive at once, the body never finishes.
  test(`${moduleName} fast headers, stalled body: the attempt times out reading the body`, async () => {
    await withServer(async ({ base }) => {
      const fetchSpy = spyFetch();
      const result = await settle(loadUseM({
        fetch: fetchSpy, sources: [`${base}/stalled-body`], maxAttemptsPerSource: 1, timeoutMs: 100,
      }));
      expect(result.status).toBe('rejected');
      expect(result.ms).toBeLessThan(PROMPT_MS);
      expect(result.error.message).toContain('request timed out after 100ms while reading the response body');
      expect(result.error.errors[0].name).toBe('TimeoutError');
      expect(fetchSpy.signals[0].aborted).toBe(true);
    });
  });

  test(`${moduleName} control: an HTTP error is reported and the next mirror is used`, async () => {
    await withServer(async ({ base, requests }) => {
      const result = await settle(loadUseM({
        sources: [`${base}/unavailable`, `${base}/stalled-body`, `${base}/complete`],
        maxAttemptsPerSource: 1, retryDelayMs: 0, timeoutMs: 200,
      }));
      expect(result.status).toBe('resolved');
      expect(result.value.use()).toBe('loopback-use');
      expect(requests).toEqual(['/unavailable', '/stalled-body', '/complete']);
    });
  });

  test(`${moduleName} control: an HTTP error alone fails with its status`, async () => {
    await withServer(async ({ base }) => {
      const result = await settle(loadUseM({
        sources: [`${base}/unavailable`], maxAttemptsPerSource: 1, timeoutMs: 1000,
      }));
      expect(result.status).toBe('rejected');
      expect(result.error.message).toContain('HTTP 503');
    });
  });

  test(`${moduleName} the caller's signal cancels a stalled body and stops every retry`, async () => {
    await withServer(async ({ base, requests }) => {
      const controller = new AbortController();
      const reason = new Error('the caller gave up');
      const fetchSpy = spyFetch();
      const loading = loadUseM({
        fetch: fetchSpy,
        sources: [`${base}/stalled-body`, `${base}/complete`],
        maxAttemptsPerSource: 3, retryDelayMs: 0, timeoutMs: 0, signal: controller.signal,
      });
      const aborter = setTimeout(() => controller.abort(reason), 100);
      const result = await settle(loading);
      clearTimeout(aborter);
      expect(result.status).toBe('rejected');
      expect(result.ms).toBeLessThan(PROMPT_MS);
      expect(result.error.cause).toBe(reason);
      expect(result.error.message).toContain('stopped after 1 of 6 planned attempts because Error: the caller gave up');
      expect(result.error.message).toContain('request aborted while reading the response body');
      expect(requests).toEqual(['/stalled-body']);
      expect(fetchSpy.signals[0].aborted).toBe(true);
    });
  });

  test(`${moduleName} totalTimeoutMs bounds a stalled body when no per-attempt timeout is set`, async () => {
    await withServer(async ({ base, requests }) => {
      const result = await settle(loadUseM({
        sources: [`${base}/stalled-body`, `${base}/complete`],
        maxAttemptsPerSource: 2, retryDelayMs: 0, timeoutMs: 0, totalTimeoutMs: 150,
      }));
      expect(result.status).toBe('rejected');
      expect(result.ms).toBeLessThan(PROMPT_MS);
      expect(result.error.cause.name).toBe('TimeoutError');
      expect(result.error.message).toContain('the overall deadline of 150ms was exceeded');
      expect(requests).toEqual(['/stalled-body']);
    });
  });

  test(`${moduleName} totalTimeoutMs ends a retry delay early`, async () => {
    await withServer(async ({ base, requests }) => {
      const result = await settle(loadUseM({
        sources: [`${base}/unavailable`], maxAttemptsPerSource: 3, retryDelayMs: 60000, totalTimeoutMs: 200,
      }));
      expect(result.status).toBe('rejected');
      expect(result.ms).toBeLessThan(PROMPT_MS);
      expect(result.error.message).toContain('stopped after 1 of 3 planned attempts');
      expect(result.error.message).toContain('HTTP 503');
      expect(requests).toEqual(['/unavailable']);
    });
  });
});

describe(`${moduleName} loadUseM deadlines with a custom fetch`, () => {
  // A response whose body never settles and which ignores every abort signal.
  const deafFetch = async () => ({ ok: true, status: 200, statusText: 'OK', text: () => new Promise(() => {}) });

  test(`${moduleName} a fetch that ignores its signal still cannot outlive timeoutMs`, async () => {
    const result = await settle(loadUseM({
      fetch: deafFetch, sources: ['https://mirror.invalid/use.js'], maxAttemptsPerSource: 1, timeoutMs: 50,
    }));
    expect(result.status).toBe('rejected');
    expect(result.error.message).toContain('request timed out after 50ms while reading the response body');
  });

  test(`${moduleName} an already aborted signal rejects without fetching`, async () => {
    const controller = new AbortController();
    controller.abort(new Error('not needed any more'));
    let calls = 0;
    const result = await settle(loadUseM({
      fetch: async () => { calls += 1; return deafFetch(); },
      signal: controller.signal,
    }));
    expect(result.status).toBe('rejected');
    expect(calls).toBe(0);
    expect(result.error.cause).toBe(controller.signal.reason);
    expect(result.error.message).toContain('stopped after 0 of 9 planned attempts because Error: not needed any more\nAttempts: none');
  });

  test(`${moduleName} rejects a signal that is not an AbortSignal`, async () => {
    await expect(loadUseM({ fetch: deafFetch, signal: 'soon' })).rejects.toThrow(/`signal` must be an AbortSignal/);
  });

  test(`${moduleName} error messages hide URL credentials and query values`, async () => {
    const leakyFetch = async (url) => {
      throw new TypeError(`could not reach ${url}`);
    };
    const result = await settle(loadUseM({
      fetch: leakyFetch,
      sources: ['https://user:hunter2@mirror.invalid/use.js?token=s3cr3t'],
      maxAttemptsPerSource: 1,
    }));
    expect(result.status).toBe('rejected');
    expect(result.error.message).not.toContain('hunter2');
    expect(result.error.message).not.toContain('s3cr3t');
    expect(result.error.message).toContain('https://***@mirror.invalid/use.js?token=***');
    // The original error is kept, unchanged, for the caller.
    expect(result.error.errors[0].message).toContain('s3cr3t');
  });

  test(`${moduleName} error messages do not repeat a long body that is not the module`, async () => {
    const body = 'private-content '.repeat(40);
    const result = await settle(loadUseM({
      fetch: async () => ({ ok: true, status: 200, text: async () => body }),
      sources: ['https://mirror.invalid/use.js'],
      maxAttemptsPerSource: 1,
    }));
    expect(result.status).toBe('rejected');
    expect(result.error.message).not.toContain('private-content');
    expect(result.error.message).toContain(`got ${body.trim().length} characters that do not look like the module`);
  });

  test(`${moduleName} error messages still quote short CDN error bodies and HTML titles`, async () => {
    const bodies = {
      'https://a.invalid/use.js': 'Internal Server Error',
      'https://b.invalid/use.js': '<!DOCTYPE html><html><head><title>502 Bad Gateway</title></head><body>' + ' '.repeat(400) + '</body></html>',
    };
    const result = await settle(loadUseM({
      fetch: async (url) => ({ ok: true, status: 200, text: async () => bodies[url] }),
      sources: Object.keys(bodies),
      maxAttemptsPerSource: 1,
    }));
    expect(result.status).toBe('rejected');
    expect(result.error.message).toContain('(got: "Internal Server Error")');
    expect(result.error.message).toContain('(got an HTML page titled "502 Bad Gateway")');
  });
});
