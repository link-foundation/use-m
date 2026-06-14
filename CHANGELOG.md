# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
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
