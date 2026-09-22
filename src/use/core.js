// Source fragment: caller context, specifier parsing, and built-in helpers.
// Generated bundles concatenate this file; do not import it directly.

const extractCallerContext = (stack) => {
  // Helper to check if a path is a use-m file
  const isUseMFile = (path) => {
    // Stack-frame URLs still include their :line:column suffix here. Browser
    // module URLs may also carry a cache-busting query or fragment.
    const normalizedPath = path
      .replace(/:\d+:\d+$/, '')
      .replace(/[?#].*$/, '');
    return normalizedPath.endsWith('/use.mjs') ||
           normalizedPath.endsWith('/use.cjs') ||
           normalizedPath.endsWith('/use.js');
  };

  // In browser environment, use the current document URL as fallback
  if (typeof window !== 'undefined' && window.location) {
    // For inline scripts in HTML, use the document's URL
    // This will be the fallback if we can't extract from stack
    const documentUrl = window.location.href;

    // Try to extract from stack first, but we'll fallback to document URL
    if (!stack) return documentUrl;
  } else if (!stack) {
    return null;
  }

  const lines = stack.split('\n');
  // Look for the first file that isn't use.mjs/use.cjs/use.js - skip the first few frames
  // to get past our internal function calls
  for (const line of lines) {
    // Skip the first few frames which are internal to use-m
    if (line.includes('extractCallerContext') ||
      line.includes('_use') ||
      line.includes('makeUse') ||
      (line.includes('<anonymous>') && (line.includes('/use.mjs') || line.includes('/use.cjs') || line.includes('/use.js')))) {
      continue;
    }

    // Try to match http(s):// URLs for browser environments
    let match = line.match(/https?:\/\/[^\s)]+/);
    if (match && !isUseMFile(match[0])) {
      // Remove line:column numbers if present
      const url = match[0].replace(/:\d+:\d+$/, '');
      return url;
    }

    // Try to match file:// URLs
    match = line.match(/file:\/\/[^\s)]+/);
    if (match && !isUseMFile(match[0])) {
      // Remove line:column numbers if present
      const url = match[0].replace(/:\d+:\d+$/, '');
      return url;
    }

    // Special handling for Jest environment
    // Jest paths often look like: at Object.<anonymous> (/path/to/test.mjs:7:24)
    // Or: at /path/to/test.mjs:7:24
    if (line.includes('.test.') || line.includes('.spec.')) {
      // Try to extract the actual test file path from Jest stack traces
      match = line.match(/\(([^)]+\.(?:test|spec)\.[^)]+):\d+:\d+\)/);
      if (!match) {
        match = line.match(/([^(\s]+\.(?:test|spec)\.[^(\s:]+):\d+:\d+/);
      }
      if (match && match[1]) {
        const testPath = match[1];
        // Convert to file:// URL format if it's an absolute path
        if (testPath.startsWith('/')) {
          return `file://${testPath}`;
        }
      }
    }

    // For Node/Deno, try to match absolute paths (improved to handle more cases)
    match = line.match(/at\s+(?:Object\.<anonymous>\s+)?(?:async\s+)?[(]?(\/[^\s:)]+\.(?:m?js|json))(?::\d+:\d+)?\)?/);
    if (match && !isUseMFile(match[1]) && !match[1].includes('node_modules')) {
      return 'file://' + match[1];
    }

    // Alternative pattern for Jest and other environments
    match = line.match(/at\s+[^(]*\(([^)]+\.(?:m?js|json)):\d+:\d+\)/);
    if (match && !isUseMFile(match[1]) && !match[1].includes('node_modules')) {
      return 'file://' + (match[1].startsWith('/') ? match[1] : '/' + match[1]);
    }
  }
  return null;
};
const parseModuleSpecifier = (moduleSpecifier) => {
  if (!moduleSpecifier || typeof moduleSpecifier !== 'string' || moduleSpecifier.length <= 0) {
    throw new Error(
      `Name for a package to be imported is not provided.
Please specify package name and an optional version (e.g., 'lodash', 'lodash@4.17.21' or '@chakra-ui/react@1.0.0').`
    );
  }
  const regex = /^(?<packageName>(@[^@/]+\/)?[^@/]+)?(?:@(?<version>[^/]*))?(?<modulePath>(?:\/[^@]+)*)?$/;
  const match = moduleSpecifier.match(regex);
  if (!match || typeof match.groups.packageName !== 'string' || match.groups.packageName.trim() === '') {
    throw new Error(
      `Failed to parse package identifier '${moduleSpecifier}'.
Please specify a package name, and an optional version (e.g.: 'lodash', 'lodash@4.17.21' or '@chakra-ui/react@1.0.0').`
    );
  }
  let { packageName, version, modulePath } = match.groups;
  if (typeof version !== 'string' || version.trim() === '') {
    version = 'latest';
  }
  if (typeof modulePath !== 'string' || modulePath.trim() === '') {
    modulePath = '';
  }
  return { packageName, version, modulePath };
}

const unresolvedPackageExport = Symbol('unresolvedPackageExport');
const primaryPackageExportConditions = new Set(['node', 'import', 'default']);
const legacyPackageExportConditions = new Set(['node', 'require', 'module', 'browser', 'default']);

const selectPackageExportTarget = (value, patternMatch, conditions) => {
  if (value === null) {
    return null;
  }
  if (typeof value === 'string') {
    return patternMatch === null ? value : value.replaceAll('*', patternMatch);
  }
  if (Array.isArray(value)) {
    for (const candidate of value) {
      const selected = selectPackageExportTarget(candidate, patternMatch, conditions);
      if (selected !== unresolvedPackageExport) {
        return selected;
      }
    }
    return unresolvedPackageExport;
  }
  if (value && typeof value === 'object') {
    for (const [condition, candidate] of Object.entries(value)) {
      if (condition !== 'default' && !conditions.has(condition)) {
        continue;
      }
      const selected = selectPackageExportTarget(candidate, patternMatch, conditions);
      if (selected !== unresolvedPackageExport) {
        return selected;
      }
    }
  }
  return unresolvedPackageExport;
};

const matchPackageExport = (exportsField, packageSubpath) => {
  if (packageSubpath === '.') {
    if (typeof exportsField === 'string' || Array.isArray(exportsField) || exportsField === null) {
      return { matched: true, patternMatch: null, value: exportsField };
    }
    if (exportsField && typeof exportsField === 'object') {
      if (Object.prototype.hasOwnProperty.call(exportsField, '.')) {
        return { matched: true, patternMatch: null, value: exportsField['.'] };
      }
      if (Object.keys(exportsField).every(key => !key.startsWith('.'))) {
        return { matched: true, patternMatch: null, value: exportsField };
      }
    }
    return { matched: false };
  }

  if (!exportsField || typeof exportsField !== 'object' || Array.isArray(exportsField)) {
    return { matched: false };
  }
  if (Object.prototype.hasOwnProperty.call(exportsField, packageSubpath)) {
    return { matched: true, patternMatch: null, value: exportsField[packageSubpath] };
  }

  let bestMatch = null;
  for (const [key, value] of Object.entries(exportsField)) {
    const wildcardIndex = key.indexOf('*');
    if (!key.startsWith('./') || wildcardIndex === -1) {
      continue;
    }
    const prefix = key.slice(0, wildcardIndex);
    const suffix = key.slice(wildcardIndex + 1);
    if (!packageSubpath.startsWith(prefix)
      || !packageSubpath.endsWith(suffix)
      || packageSubpath.length < prefix.length + suffix.length) {
      continue;
    }
    if (!bestMatch
      || prefix.length > bestMatch.prefixLength
      || (prefix.length === bestMatch.prefixLength && key.length > bestMatch.keyLength)) {
      bestMatch = {
        keyLength: key.length,
        patternMatch: packageSubpath.slice(prefix.length, packageSubpath.length - suffix.length),
        prefixLength: prefix.length,
        value,
      };
    }
  }
  return bestMatch
    ? { matched: true, patternMatch: bestMatch.patternMatch, value: bestMatch.value }
    : { matched: false };
};

const resolvePackageExportTarget = (exportsField, packageSubpath) => {
  const match = matchPackageExport(exportsField, packageSubpath);
  if (!match.matched) {
    return unresolvedPackageExport;
  }
  const selected = selectPackageExportTarget(
    match.value,
    match.patternMatch,
    primaryPackageExportConditions
  );
  return selected !== unresolvedPackageExport
    ? selected
    : selectPackageExportTarget(match.value, match.patternMatch, legacyPackageExportConditions);
};

// Not plain callback APIs: the runtime's own promise versions are kept as is.
const nonCallbackFileApis = new Set(['glob', 'watch']);

// Wraps a promisified callback API in an async function declaring `arity`
// parameters, so `.length` and `constructor.name` match Node's promise API.
// The rest parameter forwards every argument regardless of declared count.
// Index 0 declares one parameter: a promise API always takes at least the path
// or handle it operates on.
const asyncFunctionsByArity = [
  (call) => async (a, ...rest) => call(a, ...rest),
  (call) => async (a, b, ...rest) => call(a, b, ...rest),
  (call) => async (a, b, c, ...rest) => call(a, b, c, ...rest),
  (call) => async (a, b, c, d, ...rest) => call(a, b, c, d, ...rest),
  (call) => async (a, b, c, d, e, ...rest) => call(a, b, c, d, e, ...rest)
];
const minimumFileApiArity = 1;
const maximumFileApiArity = minimumFileApiArity + asyncFunctionsByArity.length - 1;
const toAsyncFunction = (call, arity, name) => {
  // A callback API can declare fewer parameters than it accepts when the
  // middle ones have defaults (`fs.stat.length` is 1 on Deno and on Node),
  // which would derive an arity of 0. The derived arity is therefore clamped
  // into the range the wrappers cover, so every rebuilt entry stays an
  // AsyncFunction: out of range, the bare `promisify` result was used instead,
  // and that is a plain Function of length 0.
  const clamped = Math.min(Math.max(arity, minimumFileApiArity), maximumFileApiArity);
  const wrapped = asyncFunctionsByArity[clamped - minimumFileApiArity](call);
  try {
    Object.defineProperty(wrapped, 'name', { value: name });
  } catch (error) {
    // `name` is not configurable on every runtime; the wrapper still works.
  }
  return wrapped;
};

// Built-ins are discovered at runtime through `node:module` instead of being
// enumerated here, so every built-in the host runtime knows about is loadable,
// including ones added after this release (issue #50). Listed below are only
// the modules needing more than the generic `import('node:<name>')` loader:
// `browser` for environments without a `node:` namespace, `node` for a runtime
// whose built-in differs from Node's. Anything left out uses the generic loader.
const builtinOverrides = {
  'console': {
    browser: () => ({ default: console, log: console.log, error: console.error, warn: console.warn, info: console.info })
  },
  'crypto': {
    browser: () => ({ default: crypto, subtle: crypto.subtle })
  },
  'url': {
    browser: () => ({ default: URL, URL, URLSearchParams })
  },
  // 'performance' is not a built-in module name: use-m maps it onto the
  // performance object, which lives in node:perf_hooks on the Node.js side.
  'performance': {
    browser: () => ({ default: performance, now: performance.now.bind(performance) }),
    node: () => import('node:perf_hooks').then(m => ({ default: m.performance, performance: m.performance, now: m.performance.now.bind(m.performance), ...m }))
  },
  // Bun and Deno expose `node:fs/promises` functions whose arity and
  // constructor differ from Node's, so the promise API is rebuilt from the
  // callback API there. Which functions exist and how many arguments each one
  // takes is read from the runtime itself, never listed here.
  'fs/promises': {
    node: async () => {
      if (typeof Bun === 'undefined' && typeof Deno === 'undefined') {
        return loadBuiltinModule('fs/promises');
      }
      const fs = await import('node:fs');
      const { promisify } = await import('node:util');
      const promises = {};
      for (const [name, value] of Object.entries(await import('node:fs/promises'))) {
        if (name === 'default') {
          continue;
        }
        const callbackApi = fs[name];
        const rebuildable = typeof value === 'function'
          && typeof callbackApi === 'function'
          && !nonCallbackFileApis.has(name);
        promises[name] = rebuildable
          ? toAsyncFunction(promisify(callbackApi), callbackApi.length - 1, name)
          : value;
      }
      return { default: promises, ...promises };
    }
  },
};

// Built-ins with no browser implementation. `node:module` is itself unavailable
// in a browser, so this is the one list that cannot be derived at runtime. It
// only chooses between a clear "not available" error and the CDN resolvers, and
// never limits what Node.js, Bun or Deno can load.
const browserUnavailableBuiltins = new Set([
  'assert', 'buffer', 'child_process', 'dns', 'dns/promises', 'events', 'fs',
  'fs/promises', 'http', 'https', 'net', 'os', 'path', 'process', 'querystring',
  'readline/promises', 'stream', 'stream/promises', 'timers/promises', 'util',
  'zlib'
]);

// `module.isBuiltin()` is the authoritative check (Node.js >= 18.6, Bun, Deno);
// older runtimes only expose `module.builtinModules`, and environments without
// `node:module` at all have no built-ins. Resolved once and reused.
let builtinCheck = null;
const isBuiltinModule = async (moduleName) => {
  if (!builtinCheck) {
    builtinCheck = import('node:module').then(
      (m) => {
        if (typeof m.isBuiltin === 'function') {
          return m.isBuiltin;
        }
        const builtins = new Set(m.builtinModules || []);
        return (name) => builtins.has(name) || builtins.has(name.replace(/^node:/, ''));
      },
      () => () => false
    );
  }
  return (await builtinCheck)(moduleName);
};

// Generic loader for built-ins without an override. `...m` spreads after
// `default`, so namespaces carrying their own default export keep it
// (node:events -> EventEmitter, node:stream -> Stream, node:assert -> assert).
const loadBuiltinModule = async (moduleName) => {
  const m = await import(`node:${moduleName}`);
  return { default: m, ...m };
};
