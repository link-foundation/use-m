// load.mjs — robust loader for use-m (https://github.com/link-foundation/use-m).
//
// The naive bootstrap recommended for loading use-m anywhere:
//
//   const { use } = eval(await (await fetch('https://unpkg.com/use-m/src/use.js')).text());
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
  'https://unpkg.com/use-m/src/use.js',
  'https://cdn.jsdelivr.net/npm/use-m/src/use.js',
  'https://esm.sh/use-m/src/use.js',
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
 * @param {object} [options]
 * @param {typeof fetch} [options.fetch] - fetch implementation (defaults to globalThis.fetch)
 * @param {string[]} [options.sources] - ordered list of CDN URLs to try
 * @param {number} [options.maxAttemptsPerSource] - attempts per source (default 3)
 * @param {number} [options.retryDelayMs] - base delay between retries, linear backoff (default 250)
 * @param {number} [options.timeoutMs] - per-attempt timeout in ms, 0 to disable (default 10000)
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

  // Delegate the retry/fallback loop to the shared engine; the per-source work
  // (fetch → validate body → eval → check `use` export) is the only loader-specific
  // part. The engine aggregates failures into the same clear, actionable error.
  return loadWithFallback(
    sources,
    async (url) => {
      const source = await fetchSource(fetchImpl, url, timeoutMs);
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
      label: 'load use-m from every CDN mirror',
      hint: 'This is usually a transient network or CDN outage — please check your connection and try again.',
    }
  );
}

// Fetch a single source with an optional per-attempt timeout, validating the
// HTTP status before returning the body text.
async function fetchSource(fetchImpl, url, timeoutMs) {
  const timeout = createTimeout(timeoutMs);
  let response;
  try {
    response = await fetchImpl(url, timeout.signal ? { signal: timeout.signal } : undefined);
  } catch (error) {
    if (timeout.timedOut()) {
      throw new Error(`request timed out after ${timeoutMs}ms`);
    }
    throw error;
  } finally {
    timeout.clear();
  }
  if (!response || !response.ok) {
    const status = response
      ? `${response.status} ${response.statusText || ''}`.trim()
      : 'no response';
    throw new Error(`HTTP ${status}`);
  }
  return response.text();
}

// Build an AbortController-backed timeout. Degrades gracefully where
// AbortController is unavailable (returns a no-op).
function createTimeout(timeoutMs) {
  if (!timeoutMs || typeof AbortController === 'undefined') {
    return { signal: undefined, clear: () => {}, timedOut: () => false };
  }
  const controller = new AbortController();
  let didTimeout = false;
  const timer = setTimeout(() => {
    didTimeout = true;
    controller.abort();
  }, timeoutMs);
  // Deliberately NOT unref()'d: this is a guard that must be allowed to fire so
  // the timeout actually triggers, and it is always cleared on the fast path via
  // `clear()`. unref()'ing it would let the runtime exit before the guard fires
  // (and trips Deno's "promise resolution is still pending" op sanitizer).
  return {
    signal: controller.signal,
    clear: () => clearTimeout(timer),
    timedOut: () => didTimeout,
  };
}
