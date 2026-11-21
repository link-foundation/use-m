[![npm](https://img.shields.io/npm/v/use-m.svg)](https://npmjs.com/use-m)
[![License](https://img.shields.io/badge/license-Unlicense-blue.svg)](https://github.com/link-foundation/use-m/blob/main/LICENSE)

[![Open in Gitpod](https://img.shields.io/badge/Gitpod-ready--to--code-f29718?logo=gitpod)](https://gitpod.io/#https://github.com/link-foundation/use-m)
[![Open in GitHub Codespaces](https://img.shields.io/badge/GitHub%20Codespaces-Open-181717?logo=github)](https://github.com/codespaces/new?hide_repo_select=true&ref=main&repo=link-foundation/use-m)

# use-m

`use-m` loads npm packages, runtime built-ins, and relative JavaScript or JSON files on demand. Use the same `await use(...)` API in Node.js, Bun, Deno, and browsers. Each package still needs to support the runtime in which you load it.

Install the loader with `npm install use-m`, then save this in an `.mjs` file and run it with Node.js.

```javascript
import { use } from 'use-m';

const lodash = await use('lodash@4.17.21');
console.log(lodash.add(1, 2)); // 3
```

On the first call, use-m installs the requested lodash version through npm if it is missing from its versioned aliases. Later runs can reuse that installation.

## Table of Contents

  - [When to use it](#when-to-use-it)
  - [Key features](#key-features)
  - [Compatibility](#compatibility)
    - [Compatibility limits](#compatibility-limits)
  - [How it works](#how-it-works)
    - [How a specifier is resolved](#how-a-specifier-is-resolved)
    - [Where packages come from](#where-packages-come-from)
    - [What an import returns](#what-an-import-returns)
  - [Usage](#usage)
    - [Universal](#universal)
    - [Missing `fetch` in Node.js or Windows Git Bash](#missing-fetch-in-nodejs-or-windows-git-bash)
    - [Robust loading (resilient CDN bootstrap)](#robust-loading-resilient-cdn-bootstrap)
      - [Troubleshooting: `SyntaxError: Unexpected identifier 'found'`](#troubleshooting-syntaxerror-unexpected-identifier-found)
    - [Resilient package loading (shared fallback engine)](#resilient-package-loading-shared-fallback-engine)
    - [Custom resolver priority](#custom-resolver-priority)
    - [Resilient npm latest-version resolution](#resilient-npm-latest-version-resolution)
      - [Node.js engine compatibility](#nodejs-engine-compatibility)
    - [In-memory module cache](#in-memory-module-cache)
    - [Module shapes and package subpaths](#module-shapes-and-package-subpaths)
    - [Interactive shell in Node.js environment](#interactive-shell-in-nodejs-environment)
    - [Browser](#browser)
    - [Deno](#deno)
    - [Bun](#bun)
    - [Network imports](#network-imports)
    - [Node.js loader hook](#nodejs-loader-hook)
    - [Independent Scripts](#independent-scripts)
      - [`use-m` and `command-stream`](#use-m-and-command-stream)
      - [`use-m` and Bun.$](#use-m-and-bun)
      - [`use-m` and `zx`](#use-m-and-zx)
      - [`use-m` and `execa`](#use-m-and-execa)
    - [Standard Import](#standard-import)
      - [Installation](#installation)
      - [CommonJS](#commonjs)
      - [ES Modules](#es-modules)
  - [Security Considerations](#security-considerations)
  - [Examples](#examples)
  - [Questions and issues](#questions-and-issues)
  - [Contributing](#contributing)
  - [License](#license)

## When to use it

- **Standalone scripts and REPL sessions.** Put a package and its version in the line that uses it. A CDN bootstrap can run a standalone script without a project manifest.
- **Optional tools.** Load a package only when the user selects the command or feature that needs it.
- **Version comparisons and migrations.** Load two pinned releases in one process to compare their output or migrate callers gradually.
- **Browser prototypes.** Try a browser-compatible npm package on a page or in the developer console without running a package manager.

For dependencies used by every run, a project manifest and lockfile let your package manager install and verify the dependency tree before execution. Runtime installation needs network access on a cold cache and can run dependency code with your process's permissions. See [security considerations](#security-considerations).

## Key features

- **On-demand packages.** Choose an exact release, a range, or a tag supported by the selected resolver. Load several specifiers in parallel with `use.all()`.
- **Runtime-specific resolution.** Node.js and Bun use versioned global aliases. Browsers and Deno can load packages over the network, with fallbacks for failed sources.
- **Built-ins and relative files.** Load host modules such as `node:fs/promises` on the server and resolve `./` and `../` JavaScript or JSON files from the calling script.
- **Configurable loading.** Build a reusable loader with `makeUse()`, customize package resolvers, or use the packaged CDN bootstrap and its retry settings.

## Compatibility

The server tests run on Linux (`ubuntu-24.04`), macOS and Windows. The table lists the versions tested in CI. [CI workflow](.github/workflows/release.yml)

| Environment | Tested versions | How to load `use-m` | Default `use()` package source |
| --- | --- | --- | --- |
| Node.js | 20.x, 22.x, 24.x | Installed package via ESM or CommonJS. Fetch and evaluate `use.js` for standalone scripts and the REPL. | `npm install -g` with versioned aliases. A use-m cache prefix is used if the npm global root is unwritable. |
| Bun | Latest stable | Installed package via ESM or CommonJS, or fetch and evaluate `use.js`. | `bun add -g` with versioned aliases. The `bun` executable must be on `PATH` and its install directory must be writable. |
| Deno | 2.x | ESM via `npm:use-m`, a local `use.mjs`, or an HTTPS import. | From a local or npm entry, `esm.sh` → `jspm.dev` → `cdn.skypack.dev` → Deno's native `npm:` import. An HTTPS `use.mjs` entry uses the CDN chain only. |
| Browser page | Headless Chrome | ESM via HTTPS, or fetch and evaluate `use.js` where the page policy permits it. | `esm.sh` → `jspm.dev` → `cdn.skypack.dev`. Packages must work in a browser. |

All four environments support package specifiers such as `lodash@4.17.21`, package subpaths when the resolver can serve them, and caller-relative JavaScript and JSON imports (`./` or `../`). A browser loads relative files over HTTP(S). JSON imports require runtime support for import attributes, and browsers require the server to send a JSON MIME type. [Node.js import attributes](https://nodejs.org/api/esm.html#import-attributes)

### Compatibility limits

- **Built-ins**. Node.js, Bun and Deno expose the built-ins reported by their respective runtimes. Their APIs can differ. Browser adapters expose web APIs only. For example, browser `crypto` exposes Web Crypto and `subtle` requires a secure context. Browser pages have no native Node.js filesystem, child process, or socket modules. Packages that depend on those APIs require a browser-compatible build.
- **Browser loading**. Use the ESM build in a page. Native CommonJS `require()` is unavailable there. Cross-origin module imports need CORS and must be allowed by the page's Content Security Policy. The universal `use.js` bootstrap requires `fetch` and permission to evaluate JavaScript strings.
- **Deno permissions**. Allow remote module hosts with `--allow-import` as needed. Computed local imports outside `node_modules` can require `--allow-read`. To use the native `npm:` fallback for undeclared packages in a project with `package.json`, set `"nodeModulesDir": "none"` or `"auto"`. [Deno permissions](https://docs.deno.com/runtime/reference/permissions/) [Deno npm compatibility](https://docs.deno.com/runtime/fundamentals/node/)
- **Other environments**. The default browser detection targets pages with `window` and `document`. Dedicated/shared workers, edge runtimes such as Cloudflare Workers, Electron, and React Native have no dedicated compatibility coverage. Service workers and worklets cannot use the dynamic `import()` that `use()` needs. Other runtime versions, operating systems and browser engines are outside the automated matrix. [HTML module loading rules](https://html.spec.whatwg.org/multipage/webappapis.html#hostloadimportedmodule)

## How it works

The root `use.mjs` and `use.cjs` bundles are the installed package's ESM and CommonJS entry points. The root `use.js` bundle is a self-contained file for the fetch-and-evaluate bootstrap. All three are generated from the same implementation. See the [bundle layout in the contributor guide](CONTRIBUTING.md#project-structure).

`use(specifier)` initializes a default loader on the first call and reuses it. `use(specifier, options)` configures a single call, and `await makeUse(options)` creates a reusable configured loader. `use.all(...specifiers)` starts the default loads concurrently and returns their results in input order.

### How a specifier is resolved

1. **Built-in module.** The resolver checks the name first. Node.js, Bun, and Deno use the built-in list reported by `node:module` and generally import the matching `node:` module. Names that require the `node:` prefix in the host still require it here. Browsers adapt their built-in `console`, `crypto`, `URL`, and `performance` APIs. Server-only built-ins such as `node:fs` and `node:child_process` raise an error in browsers.
2. **Relative file.** A specifier beginning with `./` or `../` is resolved against the caller's file or HTTP(S) URL when use-m can recover it from the stack. Otherwise it uses the configured path resolver. Use an explicit extension such as `./helper.mjs` or `./settings.json`. If stack detection is ambiguous, create a loader with `await makeUse()` and pass the base URL as its second call argument, for example `await localUse('./helper.mjs', import.meta.url)`.
3. **Package.** The runtime or a configured resolver determines how to load the package. Specifiers may include a scope, an exact version or range, and a subpath, as in `@octokit/core@6.1.5` and `yargs@17.7.2/helpers`. An omitted version requests `latest`. Named tags and ranges depend on what the selected resolver supports.

### Where packages come from

The default package source depends on the runtime and the loader entry point. Browsers and loaders running from an HTTP(S) script URL use the CDN chain. The host must support URL imports. See the [compatibility table](#compatibility) for each runtime.

Node.js checks `npm root -g`. When the default global root is unwritable, use-m can install under its own user cache prefix (`$XDG_CACHE_HOME/use-m/npm-global` or `~/.cache/use-m/npm-global`). An explicit `npm_config_prefix` or `NPM_CONFIG_PREFIX` must be writable for new installs. An exact pin such as `lodash@4.17.21` uses an alias like `lodash-v-4.17.21`, so another version can live beside it and later scripts can reuse the installed copy. On Node.js, concurrent requests for the same alias can share an install. An install lock coordinates processes, and use-m can retry failed installs and repair a damaged alias. Unpinned and range requests have their own reuse and version-selection rules. See [npm version resolution](#resilient-npm-latest-version-resolution).

`makeUse({ specifierResolver })` selects one package resolver, and `makeUse({ specifierResolvers })` supplies an ordered list. These options apply after the built-in and relative-file checks. Use [`resolverChain`](#custom-resolver-priority) to control the whole sequence. The same fallback engine powers package mirror selection, the `use-m/load` bootstrap, and the optional Node.js loader hook. Each has its own sources and retry settings. See [package fallback and errors](#resilient-package-loading-shared-fallback-engine) and [CDN bootstrap](#robust-loading-resilient-cdn-bootstrap).

Repeated calls can skip package entry checks or CDN mirror selection by reusing a successful resolution from the [in-memory cache](#in-memory-module-cache).

### What an import returns

The package resolver returns a file path or URL for dynamic `import()`. Local npm and Bun imports try the package's normal directory entry first for package roots and consult `exports` first for subpaths. The import step usually unwraps a default-only namespace. A callable default with named exports stays callable and exposes those exports on the same result. Other imports with meaningful named exports return the namespace. CommonJS interop can expose different named exports in different runtimes. A relative JSON import normally returns the parsed value. See [module shapes and package subpaths](#module-shapes-and-package-subpaths).

## Usage

### Universal

Use a fetch-and-evaluate bootstrap in a standalone script, a browser, or a REPL that provides `fetch`.

```javascript
fetch('https://unpkg.com/use-m/use.js')
  .then(async response => {
    if (!response.ok) throw new Error(`Failed to load use-m: HTTP ${response.status}`);
    const { use } = eval(await response.text());
    const _ = await use('lodash@4.17.21');
    console.log(`_.add(1, 2) = ${_.add(1, 2)}`);
  });
```

This bootstrap executes the downloaded JavaScript with `eval()`. After initialization, `use()` loads modules through the runtime's importer. Use an installed package or the browser ESM entry point in environments where `eval()` is disabled. The standalone bundle is readable and includes its semver implementation. [Inspect the bundle on unpkg](https://unpkg.com/use-m/use.js).

### Missing `fetch` in Node.js or Windows Git Bash

Node.js 18 and later normally provide `fetch`. If a host, shell wrapper, or shebang execution context does not expose it, install `use-m` locally and import the packaged polyfill before the universal bootstrap:

```javascript
import 'use-m/fetch-polyfill';
// CommonJS: require('use-m/fetch-polyfill');

const response = await fetch('https://unpkg.com/use-m/use.js');
if (!response.ok) throw new Error(`Failed to load use-m: HTTP ${response.status}`);
const { use } = eval(await response.text());
```

The polyfill supplies the complete set of missing web globals used by Undici: `fetch`, `Headers`, `Request`, `Response`, `FormData`, `File`, `Blob`, `FileReader`, `WebSocket`, `CloseEvent`, `ErrorEvent`, `MessageEvent`, `EventSource`, and `caches`. Existing globals are never replaced, so it is safe to import unconditionally.

The polyfill cannot bootstrap itself from a CDN when `fetch` is already absent; install the package first (`npm install use-m`) or provide another host-level HTTP client. See the runnable [Windows/shebang example](examples/windows-fetch-workaround/test-with-polyfill.mjs).

### Robust loading (resilient CDN bootstrap)

The minimal one-liner above is convenient, but it trusts the CDN to always return the module source. When a CDN hiccups and responds with an error body — for example the plain text `Internal Server Error` or an HTML error page — `eval()` tries to parse that text as JavaScript and throws a cryptic, misleading error:

```
SyntaxError: Unexpected identifier 'Server'
```

The error points at the `eval` line with no hint that the real cause is a transient network/CDN failure (see [#58](https://github.com/link-foundation/use-m/issues/58)). For long-running scripts, CI jobs, or anything you want to be resilient, use a loader that validates each response before `eval()`, retries, and falls back across multiple CDN mirrors.

**Option 1 — the packaged helper (`use-m/load`).** When `use-m` is installed, import the loader that ships with the package:

```javascript
import { loadUseM } from 'use-m/load';        // ES Modules
// const { loadUseM } = require('use-m/load'); // CommonJS

const { use } = await loadUseM();
const _ = await use('lodash@4.17.21');
console.log(`_.add(1, 2) = ${_.add(1, 2)}`);
```

`loadUseM()` validates the HTTP status and the response body before evaluating it, retries each source, falls back across `unpkg` → `jsDelivr` → `esm.sh`, and — when every mirror fails — throws a clear error listing every attempt instead of a `SyntaxError`. It accepts options to customize the behavior:

```javascript
const { use } = await loadUseM({
  sources: ['https://unpkg.com/use-m/use.js', 'https://cdn.jsdelivr.net/npm/use-m/use.js'],
  maxAttemptsPerSource: 3,  // attempts per mirror before moving on
  retryDelayMs: 250,        // linear backoff between attempts
  timeoutMs: 10000,         // time to receive response headers (0 disables)
});
```

**Option 2. Self-contained snippet.** This loader checks each mirror's response and tries each mirror once. You can paste it into a standalone script.

```javascript
async function loadUse(sources = [
  'https://unpkg.com/use-m/use.js',
  'https://cdn.jsdelivr.net/npm/use-m/use.js',
  'https://esm.sh/use-m/use.js',
]) {
  const failures = [];
  const errors = [];
  for (const url of sources) {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status} ${response.statusText || ''}`.trim());
      const source = await response.text();
      // Guard against CDN error bodies (HTML pages, "Internal Server Error", …)
      // that eval() would choke on. The real module is large and references `use`.
      if (source.length < 256 || source.trimStart().startsWith('<') || !source.includes('use')) {
        throw new Error(`unexpected response body: "${source.slice(0, 80).replace(/\s+/g, ' ').trim()}"`);
      }
      const exported = eval(source);
      if (!exported || typeof exported.use !== 'function') throw new Error('module did not export a `use` function');
      return exported.use;
    } catch (error) {
      errors.push(error);
      // `fetch` reports network failures as "fetch failed" with the reason in `cause`.
      failures.push(`${url}: ${error.message}${error.cause ? ` (caused by: ${error.cause.message ?? error.cause})` : ''}`);
    }
  }
  throw new AggregateError(errors, 'Failed to load use-m from every CDN mirror:\n  - ' + failures.join('\n  - '));
}

const use = await loadUse();
const _ = await use('lodash@4.17.21');
console.log(`_.add(1, 2) = ${_.add(1, 2)}`);
```

Runnable versions of both options live in [`examples/load`](https://github.com/link-foundation/use-m/tree/main/examples/load).

#### Troubleshooting: `SyntaxError: Unexpected identifier 'found'`

Projects pinned to `use-m@8.14.0` may encounter this error when bootstrapping from a CDN.

```
SyntaxError: Unexpected identifier 'found'
```

it hit a packaging regression in `use-m@8.14.0`: the entry files moved under `src/`, so the bare URL `https://unpkg.com/use-m/use.js` began returning `404` with the plain-text body `Not found: /use-m@8.14.0/use.js`. A bootstrap that `eval()`s the response without checking the HTTP status evaluates that text as JavaScript and throws the misleading error above (see [#60](https://github.com/link-foundation/use-m/issues/60)).

This is fixed in **`use-m@8.14.1`**: the bare URLs (`https://unpkg.com/use-m/use.js`, `.cjs`, `.mjs`) resolve again via root-level mirrors of `src/`, so no consumer change is required once that version is installed. To fix an affected project:

- **Recommended — pick up the patched release.** Nothing to change in your code; just ensure your CDN URL resolves to `8.14.1` or later. If you pin an exact version, bump it (e.g. `https://unpkg.com/use-m@8.14.1/use.js`).
- **One-line workaround for projects pinned specifically to `8.14.0`.** Point the URL at the `src/` path:
  - `https://unpkg.com/use-m@8.14.0/use.js` → `https://unpkg.com/use-m@8.14.0/src/use.js`
  - `https://cdn.jsdelivr.net/npm/use-m@8.14.0/use.js` → `https://cdn.jsdelivr.net/npm/use-m@8.14.0/src/use.js`

  (CDNs serve raw files and ignore package.json `exports`. This workaround is only needed for `8.14.0`; the root URL is the canonical, readable single-file bundle in current releases.)
- **Make it future-proof.** Replace the naive `eval(await (await fetch(url)).text())` with a loader that checks `response.ok`, rejects non-JavaScript bodies, and falls back across mirrors — either the packaged [`use-m/load`](#robust-loading-resilient-cdn-bootstrap) helper or the self-contained snippet above. With those two guards, a future 404/redirect can never again be silently `eval()`'d into a cryptic `SyntaxError`.

### Resilient package loading (shared fallback engine)

When a CDN import fails, `use()` tries the next source in its resolver chain. The order depends on the runtime and entry point. See the [compatibility table](#compatibility).

When no CDN can build a package for Deno (for example because its `engines.node` excludes the CDN's Node.js), `use-m` finally tries Deno's native `npm:` import. Packages that loaded from a CDN before keep loading from the same CDN. In a project with `package.json`, this last fallback needs Deno-managed npm resolution (`"nodeModulesDir": "none"` for its global cache, or `"auto"` for local modules) to load packages that are absent from the manifest.

If every source fails, `use()` throws one clear, aggregated error listing each attempt instead of the cryptic error from a single failing host:

```
Failed to import 'left-pad@1.3.0' from any CDN mirror.
Attempts:
  - esm (attempt 1/1): Failed to import module from 'https://esm.sh/left-pad@1.3.0'.
      caused by: <the error that import() threw, for example TypeError [ERR_INVALID_ARG_VALUE]: …>
  - jspm (attempt 1/1): <reason>
      caused by: <its cause>
  - skypack (attempt 1/1): <reason>
      caused by: <its cause>
```

The message includes up to eight levels of each attempt's `cause` chain. The thrown `AggregateError` exposes the original errors in attempt order, with their causes intact.

```javascript
try {
  await use('left-pad@1.3.0');
} catch (error) {
  const attempts = error.errors ?? [error];
  for (const attempt of attempts) console.error(attempt.cause ?? attempt);
}
```

You can override the chain (or inject a custom resolver) per `use` instance:

```javascript
import { makeUse } from 'use-m';        // ES Modules
// const { makeUse } = require('use-m'); // CommonJS

const use = await makeUse({
  // Entries are resolver names or custom resolver functions.
  specifierResolvers: ['esm', 'jspm', 'skypack'],
});
```

The exported `loadWithFallback` function also works with your own sources. It tries them in order, allows per-source retries, and aggregates errors if every attempt fails.

```javascript
import { loadWithFallback } from 'use-m';

const data = await loadWithFallback(
  ['https://primary.example/api', 'https://backup.example/api'],
  async (url) => {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  },
  {
    maxAttemptsPerSource: 3,  // attempts per source before moving on
    retryDelayMs: 250,        // linear backoff between attempts (0 disables)
    label: 'fetch config from any endpoint',
    hint: 'Check your network connection and try again.',
  },
);
```

A runnable, dependency-free demonstration lives in [`examples/load/shared-fallback-engine.mjs`](https://github.com/link-foundation/use-m/blob/main/examples/load/shared-fallback-engine.mjs).

### Custom resolver priority

Set `resolverChain` on `makeUse(options)` for a reusable loader or on `use(specifier, options)` for one call. The array lists every enabled resolver in priority order and takes precedence over `specifierResolver` and `specifierResolvers`. Use names from the exported `resolvers` table, including `'builtin'` and `'relative'`, or supply your own synchronous or asynchronous functions. Include each built-in, local, or network resolver you want the loader to try.

```javascript
import { makeUse } from 'use-m';

const load = await makeUse({
  resolverChain: [
    (specifier, resolvePath, options, { parentURL }) => {
      if (specifier === 'app:settings') return new URL('./settings.json', parentURL);
      return undefined;
    },
    'builtin',
    'relative',
    'npm',
  ],
});

const settings = await load('app:settings', import.meta.url);
```

A custom resolver receives `(specifier, pathResolver, options, { parentURL })`. Return a path string or a URL to import, or return `null` or `undefined` to decline. A thrown resolution error or a failed import advances to the next resolver. The first successful load wins, and an exhausted multi-entry chain throws an `AggregateError` with one explanation per attempt. A single-entry chain reports its own failure directly.

The loader infers `parentURL` from the caller when possible. Supply it as the configured loader's second argument (a URL string or an object with `parentURL`) or as `use(specifier, { parentURL, ...options })` when the base must be explicit. A Node.js resolver can use `createRequire(parentURL).resolve(specifier)` to select the caller's installed dependencies, for example when React and Ink must share the same project copy of React.

### Resilient npm latest-version resolution

In Node.js, an unpinned import such as `use('lodash')` must discover what `latest` means before deciding whether its global alias can be reused. That lookup now follows this sequence:

1. Read a fresh in-memory or disk cache entry (five-minute TTL by default).
2. Fetch `<configured registry>/<package>/latest` directly, retrying transient network failures and HTTP 403, 408, 425, 429, and 5xx responses up to three times.
3. Fall back once to `npm show <package> version engines --json`, preserving authentication, proxy, scoped-registry, and private-registry behavior from npm configuration.
4. If the registry remains unavailable, use stale cached metadata, then the version already installed under the `latest` alias.
5. If no safe fallback exists, throw an error that suggests pinning a known version.

Successful metadata is cached under `$XDG_CACHE_HOME/use-m/registry` (or `~/.cache/use-m/registry`). Cache keys include both registry and package, writes are atomic, and credentials embedded in a registry URL are stripped from requests, cache records, and diagnostic messages. The exact version returned by the lookup is installed, so a moving `latest` tag cannot make the cache marker stale immediately.

#### Node.js engine compatibility

npm installs whatever the `latest` dist-tag points to, even when that release declares `engines.node` that excludes the running Node.js, so the import later fails with a syntax or API error. `use-m` checks the `engines.node` of the `latest` manifest it already fetches (no extra request when it is compatible):

- If `latest` supports the running Node.js, or declares no `engines.node`, nothing changes: the same requests, cache entries and `<package>-v-latest` alias are used as before.
- Otherwise `use-m` fetches the version list once (`<registry>/<package>`, falling back to `npm view`) and installs the newest release not newer than `latest` that supports the running Node.js, preferring releases that are not deprecated, under its exact-version alias (shared with an explicit pin of that version). Prereleases are never selected for `latest`. The selection is cached per Node.js version, so upgrading Node picks up the newer release again.
- For semver ranges (`^1`, `~1.2`, `>=1 <3`, `1.x`, …), use-m checks for a compatible release on first install and saves it under the range alias. Later loads can reuse that alias without a registry lookup.
- If no release is compatible, `use-m` keeps npm's previous choice and logs why. Pass `engineStrict: true` (or set `USE_M_ENGINE_STRICT=true`/`1`) to fail **before npm install** instead, with an error (`code: 'USE_M_UNSUPPORTED_NODE'`) naming the package, the required engine and the running Node version, with a hint to pin a version or upgrade Node.

Releases without `engines.node` are compatible; invalid engine ranges are treated as incompatible. Only the requested package's Node engine is checked; dependency engines and native build requirements remain npm's responsibility.

For example, on Node 20.20.2, if `command-stream@2.0.0` requires Node >=22 and `1.6.2` requires Node >=20, `use('command-stream')` selects `1.6.2`. With `USE_M_DEBUG=1`, it explains the fallback:

```text
[use-m] command-stream@latest is 2.0.0 (engines node >=22.0.0) — using 1.6.2, the newest release compatible with Node 20.20.2
```

To always install the registry's `latest` release, use `await use('command-stream', { engineStrict: false })`, configure `makeUse({ engineStrict: false })`, or set `USE_M_ENGINE_STRICT=false` (or `0`). An explicit `engineStrict` option overrides the environment variable. Exact version pins and named tags other than `latest` remain explicit choices and are never engine-checked. Bun and CDN resolvers keep their runtime-specific behavior.

The resolver honors, in order, the `registry`/`npmRegistry` option, `npm_config_registry` or `NPM_CONFIG_REGISTRY`, `npm config get registry` (including `.npmrc`), and finally the public npm registry. Pinning a version, such as `use('lodash@4.17.21')`, skips metadata lookup entirely.

Use `USE_M_DEBUG=1` for decisions and fallbacks, or `USE_M_DEBUG=2` for cache paths, registry attempts, and npm commands. Logging is off by default and is written to stderr.

```bash
USE_M_DEBUG=2 node ./script.mjs
```

The same behavior can be configured per `makeUse()` instance:

```javascript
import { makeUse } from 'use-m';

const use = await makeUse({
  registry: 'https://registry.npmjs.org/',
  engineStrict: true,              // fail fast when no release supports this Node.js
  registryMaxAttempts: 3,
  registryRetryDelayMs: 250,       // exponential: 250 ms, then 500 ms
  registryRequestTimeoutMs: 10_000,
  registryCliFallback: true,
  latestVersionCache: true,
  latestVersionCacheTtlMs: 5 * 60_000,
  // latestVersionCacheDirectory: '/var/cache/use-m/registry',
  debug: 2,
});

const lodash = await use('lodash');
```

Advanced tests and embedded runtimes may inject `fetch` and `debugLogger`. Setting `registryRequestTimeoutMs` to `0` disables the request timeout; setting `latestVersionCache` or `registryCliFallback` to `false` disables that layer. Existing npm-install controls (`installMaxAttempts`, `installRetryDelayMs`, and the `installLock*` options) remain unchanged.

### In-memory module cache

Repeated calls to `use()` reuse loaded modules in the same process. Package cache hits skip install and entry-point checks for npm and Bun, or repeated mirror selection for network imports. Relative imports are keyed by their resolved location, so two scripts can each use `./config.mjs` and load their own file.

Each loaded copy of use-m tracks up to 256 entries for built-ins, import namespaces, and package paths. A package path is cached for a specific loader, specifier, and resolver chain. Local package cache entries account for the working directory and relevant environment variables. Entries expire one minute after insertion, even when the cache is idle. A later call resolves the package again, and the runtime can still reuse the module through its native import cache.

Named resolver chains can use the package path cache. Custom resolver functions, injected importers, and per-call options bypass it. Run `node examples/cache-demo.mjs` from the repository root to compare the first and repeated calls for the same package.

### Module shapes and package subpaths

When a package exports a function or class as its default alongside named exports, `use()` returns a callable view of the module. `.default` gives the original export, and named bindings stay available on the same result. Named exports take precedence when the default function has a property with the same name. `typeof` reports `'function'`, and object spread includes the module's enumerable exports. Here is a Node.js example.

```javascript
import { use } from 'use-m';

const axios = await use('axios@1.21.1');
const { default: originalAxios, AxiosError } = axios;
const { status } = await axios('https://example.com');
console.log(status, typeof originalAxios, typeof AxiosError); // 200 function function
```

When `use()` unwraps a default-only namespace, it returns the default value itself. For an extensible object or function without a `default` property, it adds a non-enumerable `default` reference to that value. Primitives, frozen values, and existing `default` properties are preserved. Modules with meaningful named exports and no callable default generally return their namespace. For example, use the named `Octokit` export or the public `yargs/helpers` subpath.

```javascript
const { Octokit } = await use('@octokit/rest@21.1.1');
const { hideBin } = await use('yargs@17.7.2/helpers');
```

The local npm and Bun resolvers try the package directory's `main` or index entry before falling back to the root `exports` entry. Subpaths go through the `exports` map first. An unlisted or explicitly blocked subpath such as `ink@5.2.1/build/index.js` can still resolve to its physical file and emit a `USE_M_UNEXPORTED_SUBPATH` warning once per subpath. Prefer public subpaths because package updates can move internal files. Node.js can filter this warning with `--disable-warning=USE_M_UNEXPORTED_SUBPATH`.

See the [module shape contract tests](tests/module-shape-contract.test.mjs) for tested examples on Node.js and Bun.

### Interactive shell in Node.js environment

1. Get the `use` function from `use-m` package:

   Single line version:

   ```javascript
   const { use } = eval(await (await fetch('https://unpkg.com/use-m/use.js')).text());
   ```

   > This minimal form is fine for an interactive REPL. For scripts that should survive a flaky CDN, prefer the resilient loader from [Robust loading](#robust-loading-resilient-cdn-bootstrap) — otherwise a CDN error body makes `eval()` throw a cryptic `SyntaxError` ([#58](https://github.com/link-foundation/use-m/issues/58)).

   <img width="778" height="420" alt="Screenshot 2025-07-25 at 2 21 28 AM" src="https://github.com/user-attachments/assets/f37692dc-0c2e-4279-8f71-1cde37176c1f" />

   Formatted multiple version:

   ```javascript
   const { use } = eval(
     await (
       await fetch(
         'https://unpkg.com/use-m/use.js'
       )
     ).text()
   );
   ```


2. Import your favorite NPM package from the registry (for example `lodash`):
   ```javascript
   const _ = await use('lodash@4.17.21');
   ```

3. Use your favorite function from dynamically imported package (for example `add`):
   ```javascript
   _.add(1, 2)
   ```

Your output should be similar to the next screenshot.

<img width="830" alt="Screenshot 2025-02-19 at 1 58 57 AM" src="https://github.com/user-attachments/assets/0ef7d4e2-f2b6-4998-87a7-5a697877f2d0" />

### Browser

Use a browser ESM import in a module script or in the developer console on a page that permits the CDN.

```javascript
const { use } = await import("https://esm.sh/use-m");
const _ = await use('lodash@4.17.21');
console.log(`_.add(1, 2) = ${_.add(1, 2)}`);
```

The CDN must serve a browser-compatible build, and the page's Content Security Policy must allow the module and its dependencies. See the [browser playground example](EXAMPLES.md#try-an-npm-package-in-a-browser).

### Deno

Load use-m through Deno's npm support to use the Deno resolver chain.

```javascript
import { use } from 'npm:use-m';

const _ = await use('lodash@4.17.21');
console.log(`_.add(1, 2) = ${_.add(1, 2)}`);

// Import multiple packages
const [lodash3, lodash4] = await use.all('lodash@3.10.1', 'lodash@4.17.21');
```

Run with Deno:
```bash
deno run --allow-import=esm.sh,raw.esm.sh,jspm.dev,cdn.skypack.dev example.mjs
```

An HTTPS import of use-m selects the HTTP(S) resolver chain. See the [Deno CDN example](examples/deno/example.mjs). To include the native `npm:` fallback, use the npm entry point above or a local bundle. In a project with a manifest, configure `nodeModulesDir` as `"none"` or `"auto"` to let Deno resolve packages missing from the manifest.

### Bun

Install the loader with `bun add use-m`. A local entry point uses Bun's global package installer for the packages you request. The fetch-and-evaluate bootstrap also works in Bun. [Bun module loading](https://bun.com/docs/runtime/auto-install)

```javascript
import { use } from 'use-m';

const _ = await use('lodash@4.17.21');
console.log(`_.add(1, 2) = ${_.add(1, 2)}`);

// Import multiple packages
const [lodash3, lodash4] = await use.all('lodash@3.10.1', 'lodash@4.17.21');
```

Run with Bun:
```bash
bun run example.mjs
```

### Network imports

Older Node.js releases such as Node.js 20 can run the [network import example](examples/network-imports/index.mjs) with `--experimental-network-imports`. Node.js 22.6.0 removed that flag. On current Node.js, use the [installed package](#standard-import) or fetch the [standalone bootstrap](#robust-loading-resilient-cdn-bootstrap). [Node.js 22.6.0 release notes](https://nodejs.org/en/blog/release/v22.6.0)

1. Create file named `example.mjs`:
   ```javascript
   const { use } = await import('https://unpkg.com/use-m/use.mjs');
   const _ = await use('lodash@4.17.21');
   console.log(`_.add(1, 2) = ${_.add(1, 2)}`);
   ```

2. Run the script on a Node.js release that supports the flag.
   ```bash
   node --experimental-network-imports example.mjs
   ```

### Node.js loader hook

The optional Node.js loader hook supports package specifiers such as `import _ from 'lodash@4.17.21'`. It tries Node.js's default resolver first. If that fails, it tries use-m's npm resolver. Run the [loader example](examples/loader/loader.mjs) from the repository root.

```bash
node --loader ./src/loader.js ./examples/loader/loader.mjs
```

### Independent Scripts

These scripts use the [standalone CDN bootstrap](#universal) to load their dependencies at runtime. Each example starts with the same bootstrap.

#### `use-m` and `command-stream`

Use command-stream to run commands and consume output as it arrives. [command-stream documentation](https://github.com/link-foundation/command-stream).

1. Create a file named `example.mjs`:

   ```javascript
   const response = await fetch('https://unpkg.com/use-m/use.js');
   if (!response.ok) throw new Error(`Failed to load use-m: HTTP ${response.status}`);
   const { use } = eval(await response.text());
   
   const { $ } = await use('command-stream@1.6.2');
   const _ = await use('lodash@4.17.21');
   
   let files = '';
   for await (const chunk of $`ls -la`.stream()) {
     if (chunk.type === 'stdout') {
       files += chunk.data.toString();
     }
   }
   console.log('JavaScript files:', _.filter(files.split('\n'), line => /\.[cm]?js$/.test(line.trim())));
   
   // Built-in cross-platform commands
   await $`mkdir -p build`;
   await $`echo "Build complete" > build/status.txt`;
   ```

2. Execute:

   ```bash
   node example.mjs
   ```

#### `use-m` and Bun.$

Bun provides a shell API through the `bun` module. Use it alongside packages loaded by use-m.

1. Create a file named `example.mjs`:

   ```javascript
   import { $ } from 'bun';

   const response = await fetch('https://unpkg.com/use-m/use.js');
   if (!response.ok) throw new Error(`Failed to load use-m: HTTP ${response.status}`);
   const { use } = eval(await response.text());

   const _ = await use('lodash@4.17.21');
   const output = await $`echo hello from Bun`.text();
   console.log(_.upperFirst(output.trim()));
   ```

2. Execute with Bun:

   ```bash
   bun run example.mjs
   ```

#### `use-m` and `zx`

1. Install zx globally

   ```bash
   npm install -g zx
   ```

2. Create a file named `example.mjs`:

   ```javascript
   const response = await fetch('https://unpkg.com/use-m/use.js');
   if (!response.ok) throw new Error(`Failed to load use-m: HTTP ${response.status}`);
   const { use } = eval(await response.text());

   const _ = await use('lodash@4.17.21');
   
   const { stdout } = await $`ls`.pipe`grep js`;
   const files = _.filter(
     _.split(stdout, '\n'),
     (item) => !_.isEmpty(item)
   );
   console.log(files);
   ```

3. Run with zx from a directory containing a JavaScript file. This example uses `ls` and `grep`.

   ```bash
   zx example.mjs
   ```

#### `use-m` and `execa`

1. Create a file named `example.mjs`:

   ```javascript
   #!/usr/bin/env node

   const response = await fetch('https://unpkg.com/use-m/use.js');
   if (!response.ok) throw new Error(`Failed to load use-m: HTTP ${response.status}`);
   const { use } = eval(await response.text());

   const _ = await use('lodash@4.17.21');
   const { $: $$ } = await use('execa@9.6.0');
   const $ = $$({ verbose: 'full' }); 
   
   const { stdout } = await $`ls`.pipe`grep js`;
   const files = _.filter(
     _.split(stdout, '\n'),
     (item) => !_.isEmpty(item)
   );
   console.log(files);
   ```

2. Run with Node.js from a directory containing a JavaScript file. This example uses `ls` and `grep`.

   ```bash
   node example.mjs
   ```

### Standard Import

Install the package to use the loader through normal Node.js module resolution.

#### Installation

Add `use-m` to your project with Yarn:

```bash
yarn add use-m
```

Or NPM:

```bash
npm i use-m
```

Load `use-m` to dynamically import the `lodash` package from npm:

#### CommonJS

```javascript
const { use } = require('use-m');

(async () => {
  const _ = await use('lodash@4.17.21');
  console.log(`_.add(1, 2) = ${_.add(1, 2)}`);
})();
```

or

```javascript
import('use-m')
  .then(async ({ use }) => {
    const _ = await use('lodash@4.17.21');
    console.log(`_.add(1, 2) = ${_.add(1, 2)}`);
  });
```

#### ES Modules

```javascript
import { use } from 'use-m';

const _ = await use('lodash@4.17.21');
console.log(`_.add(1, 2) = ${_.add(1, 2)}`);
```

or

```javascript
const { use } = await import('use-m');

const _ = await use('lodash@4.17.21');
console.log(`_.add(1, 2) = ${_.add(1, 2)}`);
```

## Security Considerations

- **Local packages.** npm and Bun apply their own install-script policies. Installing and importing a package can execute dependency code with the permissions granted to the process. Load trusted packages and avoid passing untrusted input to `use()`.
- **Remote modules.** An HTTP(S) import runs the CDN's JavaScript in the host environment. Each configured mirror is a source you trust. The loader applies no extra integrity check to package imports.
- **Fetch-and-evaluate bootstrap.** Evaluating the response runs the downloaded loader with the caller's permissions. HTTP status and response-body checks catch common server errors. A standard import of the installed package avoids evaluating fetched text.
- **Reproducible deployments.** A pin such as `lodash@4.17.21` selects a specific direct dependency release. A project lockfile records the full resolved dependency tree and works with build-time installs and integrity checks.

## Examples

Choose an example for your runtime, compare two versions, or try a custom fallback. See the [examples guide](EXAMPLES.md), [runnable scripts](examples/), and [tests](tests/).

## Questions and issues

If you have any questions or issues, [please write us on GitHub](https://github.com/link-foundation/use-m/issues). Together we can ensure this package will have highest quality possible. Your feedback is valuable and helps improve the project.

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines on:
- Setting up the development environment
- Running tests across different runtimes
- Code style and standards
- Submitting pull requests

For quick contributions, feel free to [open a Pull Request](https://github.com/link-foundation/use-m/pulls) with your suggested changes.

## License

This project is licensed under the [Unlicense](https://github.com/link-foundation/use-m/blob/main/LICENSE) (public domain). That means you are absolutely free to use this library, there is no conditions or limitations on how this library and its code can be used.
