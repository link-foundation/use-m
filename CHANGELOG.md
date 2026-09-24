# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- A conditional `use-m/fetch-polyfill` entry for Node.js hosts that do not expose `fetch`, including Windows Git Bash and shebang execution contexts. It installs every missing Undici web global while preserving host-provided implementations, and supports both ES Modules and CommonJS. Resolves [#45](https://github.com/link-foundation/use-m/issues/45).
- Robust CDN loader `use-m/load` (`loadUseM`) that validates each response before `eval()`, retries, and falls back across multiple CDN mirrors (unpkg → jsDelivr → esm.sh), failing with a clear, actionable error instead of a cryptic `SyntaxError` when a CDN returns an error body. Resolves [#58](https://github.com/link-foundation/use-m/issues/58).
- Generic, reusable `loadWithFallback(sources, load, options)` engine (exported from `use-m`) — "try each source in order, optionally retry, and fail with one aggregated error listing every attempt." It is now the single mechanism shared by both the `use-m/load` bootstrap and per-package CDN loading, so resilient loading is no longer duplicated.
- Resilient per-package loading: when `use()` fetches a package over the network (browser, Deno, or `http(s)` entry point) it now falls back across distinct CDN hosts (`esm.sh` → `jspm.dev` → `cdn.skypack.dev`; Deno uses its `esm.sh` target first) instead of depending on a single host. Exposed as `networkResolverChain` / `denoResolverChain`.
- `makeUse` options `specifierResolvers` (ordered resolver chain to try with fallback) and `import` (injectable low-level importer), enabling custom mirror chains and offline testing of the fallback wiring.
- "Resilient package loading (shared fallback engine)" documentation in README, plus a "Robust loading" section with a packaged-helper option and a dependency-free self-contained snippet, and runnable `examples/load` demonstrations.
- CONTRIBUTING.md with comprehensive contribution guidelines
- CHANGELOG.md to track version history
- Explicit "files" field in package.json for better npm publish control
- Better error messages with contextual information and error chaining

### Fixed

- Stop false positives, false negatives and warnings in CI/CD. The publish job waited only 100 seconds for npm to serve a new version, but npm served 8.16.1 and 8.16.2 after 2.6 and 5.2 minutes, so neither got a git tag or GitHub release. `scripts/npm-release.mjs` now waits up to 15 minutes and bypasses the registry's five-minute CDN cache. It reports an unreachable registry as unknown instead of "not published", creates the tag and release at the commit npm recorded, and backfills the missing `v8.16.1` and `v8.16.2`. Pull requests now fail when `package.json` holds an already-published version, instead of main failing after the merge. Jest gets the same 30 s test timeout as Bun, because real npm installs on Windows exceeded Jest's 5 s default. `npm ci` no longer warns about unapproved install scripts (`allowScripts`). Test runs no longer print the expected `ExperimentalWarning` and built-in deprecation warnings. Workflows are linted with actionlint and zizmor, third-party actions are pinned by hash, and Linux jobs are pinned to `ubuntu-24.04`. One `Pipeline status` job fails on any failed or cancelled job. Resolves [#76](https://github.com/link-foundation/use-m/issues/76).
- Preserve caller-relative JavaScript and JSON imports in compact compatibility bundles by recognizing stack-frame line/column suffixes and retaining dynamic import attributes during the build.
- Resolve npm and Bun package subpaths through the package root `exports` map, including exact mappings, wildcard patterns, nested conditions, and array fallbacks. Unexported physical files no longer bypass package encapsulation. Resolves [#47](https://github.com/link-foundation/use-m/issues/47).
- Unwrap callable CommonJS defaults on Node.js 23 and newer when the imported namespace contains Node's synthetic `module.exports` interop marker. Attached properties now remain available on the callable value instead of `use()` returning the two-key namespace. Resolves [#72](https://github.com/link-foundation/use-m/issues/72).
- Make unpinned npm resolution resilient to transient registry failures: resolve `latest` through direct registry metadata requests with retry and timeout controls, cache successful results in memory and on disk, preserve npm CLI compatibility for authenticated/private registries, fall back to stale metadata or a complete installed alias during outages, and provide default-off `USE_M_DEBUG=1|2` diagnostics without exposing registry credentials. Pinned versions continue to skip metadata lookup. Resolves [#52](https://github.com/link-foundation/use-m/issues/52).
- Keep every rebuilt `fs/promises` function an async function on Bun and Deno. The wrappers derive their arity from the runtime's callback API, and a callback API can declare fewer parameters than it accepts when the middle ones have defaults (`fs.stat.length` is 1 on Deno and on Node.js), which derived an arity of 0, matched no wrapper, and fell back to the bare `promisify` result — a plain `Function` of length 0. Deno's `use('fs/promises').stat` and `.truncate` were affected. The derived arity is now clamped into the range the wrappers cover, so a rebuilt entry is always a named `AsyncFunction` declaring at least the path it operates on; `stat` and `truncate` now report the same arity as Node.js' own promise API. Covered by `tests/fs-promises.test.mjs` and `tests/builtin-backward-compatibility.test.{mjs,cjs}`.
- Skip the `--experimental-network-imports` tests when Node.js itself rejects the option. The flag was removed in Node.js 22, so those tests could not pass on any current Node.js line; they now probe for the removal and still fail on any other error.
- Allow multiple npm aliases of a package with the same binary name to coexist. After npm reports `EEXIST`, `use-m` now verifies that the conflicting executable is a symlink into another versioned alias of the same package before retrying with `--force --no-bin-links`; unrelated executables remain untouched. Resolves [#73](https://github.com/link-foundation/use-m/issues/73).
- Serialize concurrent npm installs of the same package instead of letting them race in the npm global root. `npm install -g` takes no lock on the global prefix, so two runs writing the same `<alias>` directory delete and re-extract each other's trees — the loser fails with `ENOTEMPTY`, and a caller that saw no error at all could import a half-written package (`SyntaxError`, `ERR_MODULE_NOT_FOUND`, or a truncated entry point). Node.js evaluates sibling top-level-await subgraphs concurrently, so a project whose modules all open with `await use('some-package')` started exactly that wave on every cold run. Identical concurrent requests inside one process now share a single install (the shared promise is evicted once it settles, so genuine failures stay retryable), an install and a repair of one alias can no longer overlap, and the install itself runs under an advisory lock directory in `<npm global root>/.use-m/<alias>.lock` with an mtime heartbeat, stale-lock stealing, and a timeout that degrades to the previous unlocked behaviour. Completion is recorded in `<npm global root>/.use-m/<alias>.installed.json` *after* `npm install` returns, so a partially extracted tree — whose directory exists and whose `package.json` already carries the final version — is no longer mistaken for an installed package; aliases from older versions are adopted without reinstalling once they resolve under the lock. An incomplete alias is deleted after a failed attempt only while the lock is held. Resolves [#70](https://github.com/link-foundation/use-m/issues/70).
- Give recursive npm-alias cleanup an explicit five-retry, 100 ms retry-delay budget so transient filesystem races such as `ENOTEMPTY` do not abort incomplete-install cleanup or corrupt-alias repair. Resolves [#68](https://github.com/link-foundation/use-m/issues/68).
- Retry failed npm global installs three times with linear backoff, preserve npm stdout/stderr in the final error, and remove partial aliases after each failed attempt. Corrupt npm aliases now self-heal once when their entry point cannot resolve, their package metadata is invalid, their source is truncated, or an internal ESM dependency is missing; the retry uses a cache-busted file URL to bypass Node.js's cached module-evaluation failure. Resolves [#66](https://github.com/link-foundation/use-m/issues/66).
- **CRITICAL**: Restore root-level `use.js`, `use.cjs`, and `use.mjs` mirrors of `src/use.*` so the long-standing CDN bootstrap URL `https://unpkg.com/use-m/use.js` resolves again. After the 8.14.0 move into `src/`, that bare URL 404'd, and consumers that `eval()`'d the response body without checking the HTTP status crashed with a cryptic `SyntaxError: Unexpected identifier 'found'` (the eval'd `Not found: /use-m@8.14.0/use.js` body). The mirrors are full copies — not `require('./src/use.js')` shims, which cannot work in an `eval()` context — generated from `src/` via `npm run sync:entries` and guarded by `tests/root-entries.test.mjs`. `src/` remains the single source of truth. Resolves [#60](https://github.com/link-foundation/use-m/issues/60).
- Redirect npm-backed `use()` installs to a use-m-owned cache prefix when npm's configured global root is not writable.
- Add a regression check that keeps the npm resolver synchronized across `use.mjs`, `use.cjs`, and `use.js`.
- Keep default resolver detection from treating Node.js or Bun as a browser when tests temporarily define `global.window`.
- Refresh Deno lockfile entries for current esm.sh remote integrity.
- **CRITICAL**: Removed debug console.log statements in production code (use.mjs, use.cjs)
- **CRITICAL**: Fixed license field from "UNLICENSED" to "Unlicense" in package.json
- Fixed race condition in global use singleton by using promise-based initialization
- Fixed inconsistent file extension filtering in stack trace parsing (now checks use.mjs, use.cjs, and use.js)
- Fixed error suppression in loader.js with proper error chaining
- Updated deprecated GitHub Action from actions/create-release@v1 to softprops/action-gh-release@v2
- Replaced process.env.HOME with os.homedir() for better cross-platform compatibility

### Changed
- Split the canonical `use` implementation into focused files under `src/use/`, each below 1,500 lines. A deterministic build now produces readable standalone root bundles for package/CDN use and compact `/src/use.*` compatibility artifacts, preserving all historical entry points.
- Run the full CI runtime matrix on Linux, macOS, and Windows, with a direct shebang regression check that simulates every fetch global being absent.
- Run the CI test job on Node.js 20.x, 22.x and 24.x across Linux, macOS, and Windows. Bun and Deno execute the same suite on every operating system while using one Node.js line for dependency installation, for a 15-job runtime/OS matrix asserted by `tests/release-workflow-policy.test.mjs`.
- Detect Node.js built-in modules at runtime through `node:module` instead of the hardcoded `supportedBuiltins` map. `module.isBuiltin()` (with a `module.builtinModules` fallback for runtimes that predate it) now decides whether a specifier is a built-in, and one generic `import('node:<name>')` loader serves every built-in that needs no special handling, so `use('tty')`, `use('worker_threads')`, `use('node:vm')` and every other module the host runtime ships work without a use-m release. A specifier is checked exactly as written, so prefix-only built-ins such as `node:sqlite` and `node:test` do not shadow the npm packages named `sqlite` and `test`. Only what cannot be derived at runtime stays written down: browser implementations for `console`, `crypto`, `url` and `performance`, the built-ins that have no browser implementation (a browser has no `node:module` to ask), and the Bun/Deno `fs/promises` compatibility layer — which is itself now rebuilt from the runtime's own `node:fs` exports instead of a hand-maintained table of function names and argument counts. Each entry file loses 114 lines. Resolves [#50](https://github.com/link-foundation/use-m/issues/50).
- Organized the implementation under `src/` while preserving every historical entry point. Focused `src/use/` fragments are the single source of truth; generated compact `/src/use.*` files preserve old direct CDN paths, and generated readable root `use.*` files back package exports and canonical CDN URLs.
- Refactored `loader.js` (the Node `--loader` hook) to delegate to the shared `loadWithFallback` engine instead of bespoke try/catch. The "try the default resolver, then the use-m npm resolver" handshake is now expressed as a two-source fallback chain, making `loadWithFallback` the single retry/fallback mechanism used at all three call sites (per-package CDN loading, the `use-m/load` bootstrap, and the loader hook).
- Refactored the `use-m/load` bootstrap (`loadUseM`) to delegate its retry/fallback loop to the shared `loadWithFallback` engine instead of a private copy, so the bootstrap and the rest of the codebase use one mechanism (no behavior change; identical aggregated error message).
- Improved error handling in npm and bun resolvers with better context
- Clarified TODOs in network-imports examples with explanatory comments

## [8.13.7] - 2025-09-14

### Fixed
- Fix Bun and Deno test failures for fs/promises compatibility
- Add --allow-write permission for Deno tests
- Implement signature-matching async wrapper for Bun/Deno fs/promises
- Replace fs/promises runtime error with util.promisify fallback
- Add runtime validation for fs/promises to detect callback vs promise-based functions

### Changed
- Improve fs/promises compatibility layer for Bun and Deno runtimes
- Restore accidentally deleted test-adapter files

## [8.13.6] - 2025-08-18

### Changed
- Refactor CI/CD workflow to improve version checking and job dependencies
- Remove CI/CD badge from README
- Increase timeout for test completion in browser environment

## [8.13.5] - 2025-08-18

### Added
- Main example script demonstrating universal module usage

## [8.13.4] - 2025-08-18

### Changed
- Various improvements and bug fixes

## [8.13.3] - 2025-08-17

### Changed
- Code quality and stability improvements

## [8.13.2] - 2025-08-17

### Changed
- Performance and reliability enhancements

## [8.13.1] - 2025-08-17

### Added
- Support for GitPod and GitHub Codespaces

### Changed
- Documentation improvements

## [8.13.0] - 2025-08-16

### Added
- Enhanced cross-runtime support
- Improved built-in module emulation

### Changed
- Better error messages across all resolvers
- Improved stack trace parsing logic

## [8.12.0] - 2025-08-15

### Added
- Relative path resolution support for ./ and ../
- JSON file import support with import assertions

### Changed
- Improved caller context detection
- Enhanced browser environment support

## [8.11.0] - 2025-08-14

### Added
- Multiple CDN resolver support (esm.sh, unpkg, jsdelivr, skypack, jspm)
- CDN-specific package name transformations

### Fixed
- CDN URL construction for scoped packages

## [8.10.0] - 2025-08-13

### Added
- Bun runtime support with global package installation
- Deno runtime support with esm.sh CDN integration

### Changed
- Improved runtime detection logic
- Enhanced module resolution for different environments

## [8.9.0] - 2025-08-12

### Added
- Built-in module emulation for 25+ Node.js modules
- Cross-environment module support (browser, Node.js, Bun, Deno)
- Promise-based module variants (fs/promises, dns/promises, etc.)

### Changed
- Improved module export handling
- Better default export detection

## [8.8.0] - 2025-08-11

### Added
- CLI tool with version and loader-path commands
- Module loader hooks for custom resolution

### Changed
- Enhanced npm resolver with better package.json handling
- Improved version resolution for "latest" packages

## [8.7.0] - 2025-08-10

### Added
- Test adapter for cross-runtime testing (Jest, Bun, Deno)
- Comprehensive test suite with 34+ test files
- Examples for multiple use cases

### Changed
- Improved documentation with more examples
- Better error messages for common issues

## [8.6.0] - 2025-08-09

### Added
- Support for loading multiple versions of the same library
- Global installation with version-specific aliases

### Changed
- Enhanced module specifier parsing
- Improved version string handling

## Earlier Versions

For earlier version history, please see the [GitHub releases page](https://github.com/link-foundation/use-m/releases).

---

## Version Guidelines

- **Major version (X.0.0)**: Breaking changes that require user code updates
- **Minor version (0.X.0)**: New features, backward-compatible functionality
- **Patch version (0.0.X)**: Bug fixes, documentation updates, internal improvements

## Types of Changes

- **Added**: New features
- **Changed**: Changes in existing functionality
- **Deprecated**: Soon-to-be removed features
- **Removed**: Removed features
- **Fixed**: Bug fixes
- **Security**: Security vulnerability fixes
