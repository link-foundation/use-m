#!/usr/bin/env node
//
// Robust, self-contained use-m bootstrap.
//
// The usual one-liner
//
//   const { use } = eval(await (await fetch('https://unpkg.com/use-m/use.js')).text());
//
// crashes with a cryptic `SyntaxError: Unexpected identifier 'Server'` whenever a
// CDN returns an error body (e.g. the plain text "Internal Server Error") instead
// of the module source — eval() tries to parse that text as JavaScript.
// See https://github.com/link-foundation/use-m/issues/58
//
// This loader fetches across several CDN mirrors, validates each response before
// eval(), and fails with a clear, actionable error listing every attempt.
// Copy it into any standalone script — it has no dependencies.

async function loadUse(sources = [
  'https://unpkg.com/use-m/use.js',
  'https://cdn.jsdelivr.net/npm/use-m/use.js',
  'https://esm.sh/use-m/use.js',
]) {
  const failures = [];
  for (const url of sources) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText || ''}`.trim());
      }
      const source = await response.text();
      // Guard against CDN error bodies (HTML pages, "Internal Server Error", …)
      // that eval() would choke on. The real module is large and references `use`.
      if (source.length < 256 || source.trimStart().startsWith('<') || !source.includes('use')) {
        const preview = source.slice(0, 80).replace(/\s+/g, ' ').trim();
        throw new Error(`unexpected response body: "${preview}"`);
      }
      const exported = eval(source);
      if (!exported || typeof exported.use !== 'function') {
        throw new Error('module did not export a `use` function');
      }
      return exported.use;
    } catch (error) {
      failures.push(`${url}: ${error.message}`);
    }
  }
  throw new Error(
    'Failed to load use-m from every CDN mirror. This is usually a transient ' +
    'network or CDN outage — please check your connection and try again.\n' +
    'Attempts:\n  - ' + failures.join('\n  - ')
  );
}

const use = await loadUse();
const _ = await use('lodash@4.17.21');
console.log(`_.add(1, 2) = ${_.add(1, 2)}`);
