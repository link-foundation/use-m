#!/usr/bin/env node
//
// The shared `loadWithFallback` engine — reused everywhere use-m loads something.
//
// use-m exports the same generic retry/fallback engine that powers both the
// `use-m/load` bootstrap and use-m's own per-package CDN loading. "Try each source
// in order, optionally retry, and fail with ONE aggregated error listing every
// attempt." See https://github.com/link-foundation/use-m/issues/58
//
// This example is fully deterministic (no network) so it always runs the same way:
// it injects fake sources/resolvers to show the fallback behavior directly.
//
// Run from the repository root with: node examples/load/shared-fallback-engine.mjs

import { loadWithFallback, makeUse } from 'use-m';

// 1) Generic engine: the first source is "down", so it falls back to the second.
const value = await loadWithFallback(
  ['https://primary.example/config', 'https://backup.example/config'],
  async (url) => {
    if (url.includes('primary')) throw new Error('connection refused');
    return { loadedFrom: url, ok: true };
  },
  { label: 'fetch config from any endpoint' },
);
console.log('1) loadWithFallback fell back to:', value.loadedFrom);

// 2) Same engine inside use(): a custom mirror chain where the first mirror fails.
//    `import` is an injectable low-level importer (here it just fakes a module).
const use = await makeUse({
  specifierResolvers: [
    async (specifier) => `https://mirror-a.example/${specifier}`,
    async (specifier) => `https://mirror-b.example/${specifier}`,
  ],
  import: async (url) => {
    if (url.includes('mirror-a')) throw new Error('502 Bad Gateway');
    return { loadedFrom: url };
  },
});
const mod = await use('left-pad@1.3.0');
console.log('2) use() fell back to mirror:', mod.loadedFrom);

// 3) When every source fails, you get ONE clear, aggregated error — never the
//    cryptic error of a single failing host.
try {
  await loadWithFallback(
    ['esm', 'jspm', 'skypack'],
    async (mirror) => { throw new Error(`${mirror} is unreachable`); },
    { label: "import 'some-pkg' from any CDN mirror", hint: 'Check your connection and try again.' },
  );
} catch (error) {
  console.log('3) aggregated error:\n' + error.message);
}
