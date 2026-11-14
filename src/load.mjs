// load.mjs — robust loader for use-m (https://github.com/link-foundation/use-m).
//
// The naive bootstrap recommended for loading use-m anywhere:
//
//   const { use } = eval(await (await fetch('https://unpkg.com/use-m/use.js')).text());
//
// crashes with a confusing error whenever the CDN hiccups. When unpkg (or its
// upstream) returns an error body such as the plain text "Internal Server Error"
// instead of the module source, eval() tries to parse that text as JavaScript and
// throws `SyntaxError: Unexpected identifier 'Server'` — pointing at the eval line
// with no hint that the real problem is a transient network/CDN failure.
// See https://github.com/link-foundation/use-m/issues/58.
//
// `loadUseM()` makes the bootstrap resilient:
//   - it validates the HTTP status and the response body before eval(),
//   - it retries each source and falls back across multiple CDN mirrors, and
//   - it fails with a clear, actionable error listing every attempt instead of a
//     cryptic SyntaxError.
//
// `loadUseM()` reuses the SAME generic retry/fallback engine (`loadWithFallback`)
// that powers use-m's resilient per-package CDN loading, so the bootstrap and the
// rest of the codebase share one mechanism instead of duplicating it.
//
// NOTE: This is unrelated to `loader.js`, which is a Node.js `--loader` hook used
// to resolve bare npm specifiers; this file loads the use-m module itself.

import { loadWithFallback } from './use.mjs';

// Ordered list of CDN mirrors that serve the evaluable `use.js` build.
export const DEFAULT_SOURCES = [
  'https://unpkg.com/use-m/use.js',
  'https://cdn.jsdelivr.net/npm/use-m/use.js',
  'https://esm.sh/use-m/use.js',
];

// Common CDN/proxy plain-text error bodies that would otherwise be eval()'d as code.
const ERROR_BODY_PATTERN =
  /^(internal server error|bad gateway|service unavailable|gateway timeout|request timeout|not found|forbidden|too many requests|origin is unreachable|cannot find package[^]*)\.?$/i;

/**
 * Heuristic check that the fetched text is the use-m module source rather than a
 * CDN error page. Error responses are typically HTML or short plain-text bodies
 * like "Internal Server Error"; the real module is tens of kilobytes of
 * JavaScript that defines a `use` factory. This is a cheap sanity check that
 * yields a clear error message — eval() ultimately validates the rest.
 *
 * @param {unknown} source
 * @returns {boolean}
 */
export function looksLikeUseModule(source) {
  if (typeof source !== 'string') return false;
  const trimmed = source.trim();
  if (trimmed.length === 0) return false;
  // The real module is large; CDN error bodies are short. A conservative length
  // floor rejects "Internal Server Error" and friends without coupling to the
  // exact module size (use.js is tens of KB).
  if (trimmed.length < 256) return false;
  // HTML error pages (e.g. Cloudflare / nginx) start with a tag.
  if (trimmed.startsWith('<')) return false;
  // Common plain-text error bodies.
  if (ERROR_BODY_PATTERN.test(trimmed)) return false;
  // The module references `use` and contains JavaScript syntax.
  return trimmed.includes('use') && /[{(=]/.test(trimmed);
}

/**
 * Load use-m, returning the object it exports (with a `use` function).
 *
 * Deadlines (issue #80). `timeoutMs` bounds each attempt from the request until
 * the whole response body has been read, so a server that sends its headers
 * and then stalls the body cannot hang the loader. `totalTimeoutMs` bounds the
 * whole load across every attempt, mirror and retry delay, and `signal` lets the
 * caller cancel it. Either one aborts the attempt in progress, starts no further
 * attempt, and rejects with the aggregated error: its message names why loading
 * stopped and lists the attempts made so far, `errors` holds their errors, and
 * `cause` is the abort reason (the caller's `signal.reason`, or a
 * `TimeoutError` for `totalTimeoutMs`). The loader stops waiting even when a
 * custom `fetch` ignores the signal it is given.
 *
 * @param {object} [options]
 * @param {typeof fetch} [options.fetch] - fetch implementation (defaults to globalThis.fetch)
 * @param {string[]} [options.sources] - ordered list of CDN URLs to try
 * @param {number} [options.maxAttemptsPerSource] - attempts per source (default 3)
 * @param {number} [options.retryDelayMs] - base delay between retries, linear backoff (default 250)
 * @param {number} [options.timeoutMs] - per-attempt timeout in ms covering headers and body, 0 to disable (default 10000)
 * @param {number} [options.totalTimeoutMs] - overall deadline in ms for every attempt, mirror and retry delay, 0 to disable (default 0)
 * @param {AbortSignal} [options.signal] - cancels the load when aborted
 * @param {(source: string) => unknown} [options.evaluate] - evaluator for the module source (defaults to eval)
 * @returns {Promise<{ use: Function }>}
 */
export async function loadUseM(options = {}) {
  const {
    fetch: fetchImpl = (typeof globalThis !== 'undefined' ? globalThis.fetch : undefined),
    sources = DEFAULT_SOURCES,
    maxAttemptsPerSource = 3,
    retryDelayMs = 250,
    timeoutMs = 10000,
    totalTimeoutMs = 0,
    signal: callerSignal,
    evaluate = (source) => eval(source),
  } = options;

  if (typeof fetchImpl !== 'function') {
    throw new Error(
      'Cannot load use-m: `fetch` is not available in this runtime. ' +
      'Use Node.js >= 18, Bun, Deno, or a browser, or pass a `fetch` implementation via options.'
    );
  }
  if (!Array.isArray(sources) || sources.length === 0) {
    throw new Error('Cannot load use-m: `sources` must be a non-empty array of URLs.');
  }
  if (callerSignal !== undefined && callerSignal !== null && !isAbortSignal(callerSignal)) {
    throw new TypeError('Cannot load use-m: `signal` must be an AbortSignal.');
  }

  const deadline = createDeadline(callerSignal || undefined, totalTimeoutMs);
  try {
    // Delegate the retry/fallback loop to the shared engine; the per-source work
    // (fetch → validate body → eval → check `use` export) is the only
    // loader-specific part. The engine aggregates failures into the same clear,
    // actionable error, and stops early once the deadline signal aborts.
    return await loadWithFallback(
      sources,
      async (url) => {
        const source = await fetchSource(fetchImpl, url, timeoutMs, deadline.signal);
        if (!looksLikeUseModule(source)) {
          const preview = source.slice(0, 80).replace(/\s+/g, ' ').trim();
          throw new Error(`response was not the use-m module (got: "${preview}")`);
        }
        const exported = await evaluate(source);
        if (!exported || typeof exported.use !== 'function') {
          throw new Error('evaluated module did not export a `use` function');
        }
        return exported;
      },
      {
        maxAttemptsPerSource,
        retryDelayMs,
        signal: deadline.signal,
        describeSource: redactUrl,
        label: 'load use-m from every CDN mirror',
        hint: 'This is usually a transient network or CDN outage — please check your connection and try again.',
      }
    );
  } finally {
    deadline.clear();
  }
}

// Fetch a single source and read its body under one attempt deadline. The
// attempt's timer and abort signal stay active until the body has been read
// (or the attempt failed): `fetch` resolves as soon as the headers arrive, so
// clearing them earlier would leave a stalled body unbounded (issue #80).
async function fetchSource(fetchImpl, url, timeoutMs, parentSignal) {
  const attempt = createAttempt(timeoutMs, parentSignal);
  let stage = 'while waiting for the response headers';
  try {
    const response = await untilAborted(
      attempt.signal,
      () => fetchImpl(url, attempt.signal ? { signal: attempt.signal } : undefined)
    );
    if (!response || !response.ok) {
      const status = response
        ? `${response.status} ${response.statusText || ''}`.trim()
        : 'no response';
      discardBody(response);
      throw new Error(`HTTP ${status}`);
    }
    stage = 'while reading the response body';
    return await untilAborted(attempt.signal, () => response.text());
  } catch (error) {
    if (attempt.timedOut()) {
      const timeout = new Error(`request timed out after ${timeoutMs}ms ${stage}`);
      timeout.name = 'TimeoutError';
      throw timeout;
    }
    if (parentSignal && parentSignal.aborted) {
      // The engine reports why loading stopped; this attempt only says where.
      const aborted = new Error(`request aborted ${stage}`);
      aborted.name = 'AbortError';
      throw aborted;
    }
    throw error;
  } finally {
    attempt.clear();
  }
}

// Settle with `start()`'s promise, or reject as soon as `signal` aborts —
// whichever happens first — so a `fetch` or body read that ignores its signal
// still cannot outlive the deadline. A late settlement is observed and ignored.
function untilAborted(signal, start) {
  const pending = new Promise((resolve) => resolve(start()));
  if (!signal) return pending;
  return new Promise((resolve, reject) => {
    const onAbort = () => reject(abortReason(signal));
    if (signal.aborted) {
      onAbort();
    } else {
      signal.addEventListener('abort', onAbort, { once: true });
    }
    pending.then(
      (value) => {
        signal.removeEventListener('abort', onAbort);
        resolve(value);
      },
      (error) => {
        signal.removeEventListener('abort', onAbort);
        reject(error);
      }
    );
  });
}

// Release the connection of a response whose body will not be read.
function discardBody(response) {
  try {
    const cancelled = response && response.body && typeof response.body.cancel === 'function'
      ? response.body.cancel()
      : undefined;
    if (cancelled && typeof cancelled.catch === 'function') cancelled.catch(() => {});
  } catch {
    // A locked or already consumed body cannot be cancelled; nothing to release.
  }
}

// One attempt's abort signal: it aborts when the per-attempt timer fires or the
// parent (caller/overall) signal aborts. Degrades to the parent signal where
// AbortController is unavailable.
function createAttempt(timeoutMs, parentSignal) {
  if (typeof AbortController === 'undefined' || (!timeoutMs && !parentSignal)) {
    return { signal: parentSignal, clear: () => {}, timedOut: () => false };
  }
  const controller = new AbortController();
  let didTimeout = false;
  const onParentAbort = () => controller.abort(abortReason(parentSignal));
  if (parentSignal) {
    if (parentSignal.aborted) onParentAbort();
    else parentSignal.addEventListener('abort', onParentAbort, { once: true });
  }
  // Deliberately NOT unref()'d: this is a guard that must be allowed to fire so
  // the timeout actually triggers, and it is always cleared on the fast path via
  // `clear()`. unref()'ing it would let the runtime exit before the guard fires
  // (and trips Deno's "promise resolution is still pending" op sanitizer).
  const timer = timeoutMs
    ? setTimeout(() => {
      didTimeout = true;
      controller.abort(timeoutError(`request timed out after ${timeoutMs}ms`));
    }, timeoutMs)
    : undefined;
  return {
    signal: controller.signal,
    clear: () => {
      clearTimeout(timer);
      if (parentSignal) parentSignal.removeEventListener('abort', onParentAbort);
    },
    timedOut: () => didTimeout,
  };
}

// The signal that bounds the whole load: it aborts when the caller's signal
// aborts or `totalTimeoutMs` elapses, whichever comes first.
function createDeadline(callerSignal, totalTimeoutMs) {
  if (!totalTimeoutMs || typeof AbortController === 'undefined') {
    return { signal: callerSignal, clear: () => {} };
  }
  const controller = new AbortController();
  const onCallerAbort = () => controller.abort(abortReason(callerSignal));
  if (callerSignal) {
    if (callerSignal.aborted) onCallerAbort();
    else callerSignal.addEventListener('abort', onCallerAbort, { once: true });
  }
  // Not unref()'d for the same reason as the per-attempt timer; always cleared.
  const timer = setTimeout(() => {
    controller.abort(timeoutError(`the overall deadline of ${totalTimeoutMs}ms was exceeded`));
  }, totalTimeoutMs);
  return {
    signal: controller.signal,
    clear: () => {
      clearTimeout(timer);
      if (callerSignal) callerSignal.removeEventListener('abort', onCallerAbort);
    },
  };
}

function timeoutError(message) {
  const error = new Error(message);
  error.name = 'TimeoutError';
  return error;
}

// `signal.reason`, or an `AbortError` on runtimes whose signals carry none.
function abortReason(signal) {
  if (signal.reason !== undefined) return signal.reason;
  const error = new Error('This operation was aborted');
  error.name = 'AbortError';
  return error;
}

function isAbortSignal(value) {
  return typeof value === 'object'
    && typeof value.aborted === 'boolean'
    && typeof value.addEventListener === 'function'
    && typeof value.removeEventListener === 'function';
}

// Source label for error messages, without credentials: URL user info and
// query parameter values are replaced with `***`.
function redactUrl(source) {
  const text = String(source);
  let url;
  try {
    url = new URL(text);
  } catch {
    return text;
  }
  if (!url.username && !url.password && !url.search) return text;
  if (url.username || url.password) {
    url.username = '***';
    url.password = '';
  }
  if (url.search) {
    const keys = [...new Set(url.searchParams.keys())];
    url.search = keys.map((key) => `${encodeURIComponent(key)}=***`).join('&');
  }
  return url.href;
}
