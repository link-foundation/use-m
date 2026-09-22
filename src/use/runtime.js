// Source fragment: fallback loading and the public use()/makeUse() runtime.
// Generated bundles concatenate this file; do not import it directly.

// Generic, mechanism-agnostic "try sources in order until one works" engine.
// Tries each `source` in order (optionally retrying each `maxAttemptsPerSource`
// times with linear backoff) and returns the first successful `load(source,
// attempt)` result. If every attempt fails it throws ONE clear, aggregated error
// listing every attempt — never just the cryptic last failure (issue #58).
//
// This is the shared core reused by both resilient per-package CDN imports (see
// `makeUse` below) and the use-m bootstrap loader (`loadUseM` in load.mjs /
// load.cjs), so retry/fallback behaves identically everywhere it is used.
//
// @param {Array<unknown>} sources - ordered list of things to try (URLs, resolver keys, ...)
// @param {(source: unknown, attempt: number) => Promise<any>} load - loads one source; throws on failure
// @param {object} [options]
// @param {number} [options.maxAttemptsPerSource] - attempts per source (default 1)
// @param {number} [options.retryDelayMs] - base delay between retries, linear backoff (default 0)
// @param {(source: unknown) => string} [options.describeSource] - human label for a source in errors
// @param {string} [options.label] - what we were trying to do (used in the error message)
// @param {string} [options.hint] - extra guidance appended to the aggregated error
const loadWithFallback = async (sources, load, options = {}) => {
  const {
    maxAttemptsPerSource = 1,
    retryDelayMs = 0,
    describeSource = (source) => String(source),
    label = 'load from any source',
    hint = '',
  } = options
  if (!Array.isArray(sources) || sources.length === 0) {
    throw new Error(`Failed to ${label}: no sources were provided.`)
  }
  if (typeof load !== 'function') {
    throw new Error(`Failed to ${label}: a load function is required.`)
  }
  const failures = []
  for (const source of sources) {
    for (let attempt = 1; attempt <= maxAttemptsPerSource; attempt++) {
      try {
        return await load(source, attempt)
      } catch (error) {
        const reason = error && error.message ? error.message : String(error)
        failures.push(`${describeSource(source)} (attempt ${attempt}/${maxAttemptsPerSource}): ${reason}`)
        if (attempt < maxAttemptsPerSource && retryDelayMs > 0) {
          await new Promise((resolve) => setTimeout(resolve, retryDelayMs * attempt))
        }
      }
    }
  }
  throw new Error(
    `Failed to ${label}.${hint ? ' ' + hint : ''}\nAttempts:\n  - ` + failures.join('\n  - ')
  )
}

const baseUse = async (modulePath) => {
  // Dynamically import the module
  try {
    const isJsonModule = /\.json(?:[?#].*)?$/i.test(modulePath);
    const module = isJsonModule
      ? await import(modulePath, { with: { type: 'json' } })
      : await import(modulePath);

    // More robust default export handling for cross-environment compatibility
    const keys = Object.keys(module);

    // If it's a Module object with a default property, unwrap it
    if (module.default !== undefined) {
      // Check if this is likely a CommonJS module with only default export
      if (keys.length === 1 && keys[0] === 'default') {
        return module.default;
      }

      // Check if default is the main export and other keys are just function/module metadata
      const metadataKeys = new Set([
        'default', '__esModule', 'Symbol(Symbol.toStringTag)',
        'length', 'name', 'prototype', 'constructor',
        'toString', 'valueOf', 'hasOwnProperty', 'isPrototypeOf', 'propertyIsEnumerable'
      ]);
      if (module.default === module['module.exports']) {
        metadataKeys.add('module.exports');
      }

      const nonMetadataKeys = keys.filter(key => !metadataKeys.has(key));

      // If there are no significant non-metadata keys, return the default
      if (nonMetadataKeys.length === 0) {
        return module.default;
      }
    }

    // Return the whole module if it has multiple meaningful exports or no default
    return module;
  } catch (error) {
    throw new Error(`Failed to import module from '${modulePath}'.`, { cause: error });
  }
}

const makeUse = async (options) => {
  let scriptPath = options?.scriptPath;
  const hasBrowserGlobals = typeof window !== 'undefined' && typeof document !== 'undefined';
  if (!scriptPath && !hasBrowserGlobals && typeof global !== 'undefined' && typeof global['__filename'] !== 'undefined') {
    scriptPath = global['__filename'];
  }
  const metaUrl = options?.meta?.url;
  if (!scriptPath && metaUrl) {
    scriptPath = metaUrl;
  }
  // @use-m-default-script-path
  let protocol;
  if (scriptPath) {
    try {
      protocol = new URL(scriptPath).protocol;
    } catch {
      // If scriptPath is a local file path, convert it to file:// URL
      if (scriptPath.startsWith('/') || scriptPath.includes('\\')) {
        protocol = 'file:';
      }
    }
  }
  // Build the ordered chain of specifier resolvers to try. A single-entry chain
  // means "no fallback": an explicit user choice (function or name) and the local
  // npm/bun runtimes import exactly as before. The browser/HTTP and Deno network
  // defaults use a multi-host chain so a CDN outage falls back instead of failing.
  // `import` is an injectable low-level importer (defaults to baseUse) used for
  // dependency injection in tests and advanced setups.
  const importModule = typeof options?.import === 'function' ? options.import : baseUse;
  let resolverChain;
  if (Array.isArray(options?.specifierResolvers) && options.specifierResolvers.length > 0) {
    resolverChain = options.specifierResolvers;
  } else if (typeof options?.specifierResolver === 'function' || options?.specifierResolver) {
    resolverChain = [options.specifierResolver];
  } else {
    const isDenoRuntime = typeof Deno !== 'undefined';
    const isBunRuntime = typeof Bun !== 'undefined';
    const isBrowserRuntime = !isDenoRuntime && !isBunRuntime && hasBrowserGlobals;
    const isNodeRuntime = !isDenoRuntime && !isBunRuntime && !isBrowserRuntime && typeof process !== 'undefined' && Boolean(process.versions?.node);
    if (isBrowserRuntime || (protocol && (protocol === 'http:' || protocol === 'https:'))) {
      resolverChain = networkResolverChain;
    } else if (isDenoRuntime) {
      resolverChain = denoResolverChain;
    } else if (isBunRuntime) {
      resolverChain = ['bun'];
    } else {
      resolverChain = ['npm'];
    }
  }
  let pathResolver = options?.pathResolver;
  if (!pathResolver) {
    const isCJS = typeof module !== "undefined" && !!module.exports;
    const hasRequire = typeof require !== 'undefined';
    const hasScriptPath = scriptPath && (!protocol || protocol === 'file:');
    if (hasRequire && hasScriptPath) {
      if (isCJS) {
        pathResolver = require.resolve;
      } else {
        pathResolver = await import('node:module')
        .then(module => module.createRequire(scriptPath))
        .then(require => require.resolve);
      }
    } else if (hasRequire) {
      pathResolver = require.resolve;
    } else if (hasScriptPath) {
      pathResolver = await import('node:module')
        .then(module => module.createRequire(scriptPath))
        .then(require => require.resolve);
    } else {
      pathResolver = (path) => path;
    }
  }
  return async (moduleSpecifier, providedCallerContext) => {
    const stack = new Error().stack;

    // Use provided caller context or try to capture it from stack trace
    const callerContext = providedCallerContext || extractCallerContext(stack);

    // Always try built-in resolver first
    const builtinModule = await resolvers.builtin(moduleSpecifier, pathResolver);
    if (builtinModule) {
      return builtinModule;
    }

    // Try relative path resolver second (for ./, ../, ../../, etc.)
    const relativeModule = await resolvers.relative(moduleSpecifier, pathResolver, callerContext);
    if (relativeModule) {
      return relativeModule;
    }

    // If not a built-in or relative module, resolve + import via the configured
    // resolver chain. A single-entry chain imports directly (preserving the
    // original behavior and error); a multi-entry chain falls back across CDN
    // mirrors via the shared loadWithFallback engine.
    if (resolverChain.length === 1) {
      const resolver = resolverChain[0];
      const resolverFunction = toResolverFunction(resolver);
      const modulePath = await resolverFunction(moduleSpecifier, pathResolver, options);
      try {
        return await importModule(modulePath);
      } catch (error) {
        if (resolver !== 'npm' || !isRecoverableNpmImportError(error, modulePath)) {
          throw error;
        }
        const repairedModulePath = await resolverFunction(
          moduleSpecifier,
          pathResolver,
          { ...(options || {}), repair: true }
        );
        return importModule(await cacheBustNpmModulePath(repairedModulePath));
      }
    }
    return loadWithFallback(
      resolverChain,
      async (resolver) => {
        const modulePath = await toResolverFunction(resolver)(moduleSpecifier, pathResolver);
        return importModule(modulePath);
      },
      {
        label: `import '${moduleSpecifier}' from any CDN mirror`,
        describeSource: (resolver) => (typeof resolver === 'function' ? 'custom resolver' : String(resolver)),
      }
    );
  };
}

let __usePromise = null;
const use = async (moduleSpecifier) => {
  const stack = new Error().stack;

  // For Bun, we need to capture the stack trace before any other calls
  let bunCallerContext = null;
  if (typeof Bun !== 'undefined') {
    if (stack) {
      const lines = stack.split('\n');
      // Look for any .mjs file that's not use.mjs
      for (const line of lines) {
        const match = line.match(/[(]?(\/[^\s:)]+\.m?js)/);
        if (match && !match[1].endsWith('/use.mjs')) {
          bunCallerContext = 'file://' + match[1];
          break;
        }
      }
    }
  }

  // Capture the caller context here, before entering makeUse
  const callerContext = bunCallerContext || extractCallerContext(stack);

  if (!__usePromise) {
    __usePromise = makeUse();
  }
  const useInstance = await __usePromise;
  return useInstance(moduleSpecifier, callerContext);
}
use.all = async (...moduleSpecifiers) => {
  if (!__usePromise) {
    __usePromise = makeUse();
  }
  const useInstance = await __usePromise;
  return Promise.all(moduleSpecifiers.map(useInstance));
}
