// loader.js
//
// Node.js --loader hook. When a regular `import` cannot resolve a specifier
// (e.g. the user wrote `import _ from 'lodash@4.17.21'` without installing it),
// we fall back to the use-m `npm` resolver, which lazily installs the package
// into use-m's cache and returns a real on-disk file URL.
//
// The "try the default resolver, then try the npm resolver" handshake is just a
// two-source fallback chain, so we reuse `loadWithFallback` — the same engine
// that powers per-package CDN fallback in `src/use.{mjs,cjs}` and the
// bootstrap fallback in `src/load.{mjs,cjs}`. One engine, three call sites.

import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { resolvers, loadWithFallback } from './use.mjs';

const require = createRequire(import.meta.url);

// Sources are the two resolution mechanisms we'll try, in order.
const DEFAULT = 'node-default-resolver';
const NPM = 'use-m-npm-resolver';

// The `resolve` hook customizes how module URLs are resolved.
export async function resolve(specifier, context, defaultResolve) {
  return loadWithFallback(
    [DEFAULT, NPM],
    async (source) => {
      if (source === DEFAULT) {
        const resolution = await defaultResolve(specifier, context, defaultResolve);
        if (!resolution || !resolution.url) {
          throw new Error('default resolver returned no url');
        }
        return resolution;
      }
      // NPM: lazily install (if needed) and resolve via use-m's npm resolver.
      const resolvedUrl = await resolvers.npm(specifier, require.resolve);
      return { url: pathToFileURL(resolvedUrl).href };
    },
    {
      label: `resolve module: ${specifier}`,
      describeSource: (source) =>
        source === DEFAULT ? 'node default resolver' : 'use-m npm resolver',
      hint: 'Install the package, fix the specifier, or check the registry is reachable.',
    },
  );
}

// The `load` hook customizes how module code is loaded.
export async function load(url, context, defaultLoad) {
  return defaultLoad(url, context, defaultLoad);
}

// Optional: transform the source code of loaded modules.
export async function transformSource(source, context, defaultTransformSource) {
  return defaultTransformSource(source, context, defaultTransformSource);
}
