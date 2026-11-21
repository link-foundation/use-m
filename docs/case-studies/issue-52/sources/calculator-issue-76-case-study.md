# Case Study: Issue #76 — CI/CD Failing: Auto Release "Publish to Crates.io" Step

## Problem Statement

**Issue URL:** https://github.com/link-assistant/calculator/issues/76
**Failing Run:** https://github.com/link-assistant/calculator/actions/runs/22410298646/job/64881763135

The CI/CD Pipeline workflow fails on the **Auto Release** job at the **"Publish to Crates.io"** step.

**Error from CI logs:**
```
Error: Command failed: npm show command-stream version
npm error code E403
npm error 403 403 Forbidden - GET https://registry.npmjs.org/command-stream
npm error 403 In most cases, you or one of your dependencies are requesting
npm error 403 a package version that is forbidden by your security policy, or
npm error 403 on a server you do not have access to.
```

**Impact:**
- Crates.io publication is blocked, meaning no new package versions are released
- GitHub release tags and version bumps are NOT created
- The CI/CD pipeline shows as "failed", creating noise and confusion

---

## Timeline and Sequence of Events

### Phase 1: Auto Release Job Setup
- CI/CD Pipeline triggers on push to `main` (commit `3dd9d248`)
- `detect-changes` job detects Rust source changes → triggers `auto-release` job
- All prerequisite jobs succeed: `lint`, `test`, `build`
- `auto-release` job begins at `2026-02-25T18:28:58Z`

### Phase 2: Scripts Run Successfully in Auto Release
1. `git-config.mjs` — Configures git user: ✅
2. `get-bump-type.mjs` — Detects `minor` bump from 36 changelog fragments: ✅
3. `check-release-needed.mjs` — Loads `command-stream` via `use-m`, returns `should_release=true`: ✅
4. `version-and-commit.mjs` — Loads `command-stream` via `use-m`, bumps Cargo.toml to `0.2.0`: ✅
5. `get-version.mjs` — Returns `0.2.0`: ✅
6. `cargo build --release` — Compiles Rust crate (~60 seconds): ✅

### Phase 3: Failure at Publish Step
7. `publish-crate.mjs` — Loads `command-stream` via `use-m`:
   - `use-m` calls `npm show command-stream version` to resolve latest version
   - **npm registry returns HTTP 403**
   - `use-m` throws unhandled error
   - Script exits with code 1 ❌

### Phase 4: Downstream Impact
- `Publish to Crates.io` step fails
- `Create GitHub Release` step is **skipped** (conditional on publish success)
- CI pipeline reports as **failed**

---

## Root Cause Analysis

### Root Cause: `use-m` Always Calls `npm show` for `@latest` Packages

The script `scripts/publish-crate.mjs` uses the `use-m` library to dynamically load `command-stream`:

```javascript
// Load use-m dynamically
const { use } = eval(
  await (await fetch('https://unpkg.com/use-m/use.js')).text()
);

// Import command-stream using use-m (defaults to @latest)
const { $ } = await use('command-stream');
```

**`use-m`'s `getLatestVersion()` function** (from `https://unpkg.com/use-m/use.js`):

```javascript
const getLatestVersion = async (packageName) => {
  const { stdout: version } = await execAsync(`npm show ${packageName} version`);
  return version.trim();
};

const ensurePackageInstalled = async ({ packageName, version }) => {
  // ...
  if (version === 'latest') {
    const latestVersion = await getLatestVersion(packageName); // ALWAYS called for @latest
    const installedVersion = await getInstalledPackageVersion(packagePath);
    if (installedVersion === latestVersion) {
      return packagePath; // Use cache if versions match
    }
  }
  // ... install if not cached
};
```

**Key behavior:** For packages loaded without a pinned version (`use('command-stream')` defaults to `@latest`), `use-m` **always calls `npm show <package> version`** — even if the package was already installed and cached. There is no time-based or session-level caching for `@latest` lookups (see: https://github.com/link-foundation/use-m/issues/40 — this feature is planned but not yet implemented as of use-m v8.13.7).

### Why the 403 Error Occurs

The npm registry returns HTTP 403 for `npm show command-stream version` in the CI environment. This occurs despite:
- `command-stream` being a **public npm package** (accessible without auth at `https://registry.npmjs.org/command-stream`)
- The same `npm show command-stream version` call succeeding earlier in the same job (used by `check-release-needed.mjs` and `version-and-commit.mjs`)

**Most likely explanation**: After `npm install -g command-stream-v-latest@npm:command-stream@0.9.4` runs (performed by `use-m` in `version-and-commit.mjs`), the global npm configuration is modified in a way that causes subsequent `npm show` calls to fail. The GitHub Actions runner environment appears to configure npm with an auth token (possibly from `actions/setup-node@v4` or from the checkout step), and this token may impose restrictions on registry queries after certain npm operations.

**Contributing factors:**
1. `use-m` lacks caching for `@latest` lookups — calls `npm show` on every script run
2. Multiple scripts in the `auto-release` job load `command-stream` (check-release-needed, version-and-commit, publish-crate), resulting in 3+ calls to `npm show command-stream version`
3. No error handling in `use-m`'s `getLatestVersion()` — errors propagate uncaught

### Why Earlier Calls Succeed But Publish Fails

Scripts that run BEFORE `cargo build --release`:
- `check-release-needed.mjs` (`18:29:13` → `18:29:15`) → ✅
- `version-and-commit.mjs` (`18:29:15` → `18:29:16`) → ✅

Script that runs AFTER `cargo build --release`:
- `publish-crate.mjs` (`18:30:16` → fails at `18:30:17`) → ❌

The `cargo build --release` step runs from `18:29:16` to `18:30:16` (~60 seconds). During this time, `version-and-commit.mjs` has already executed `npm install -g` for `command-stream`, potentially modifying npm's global configuration state.

---

## Evidence

### CI Run Data

See `ci-runs.json` for run IDs and conclusions.

**Failing Run ID:** `22410298646`
**Failing Job ID:** `64881763135`
**Log location:** `ci-logs/run-22410298646.log` (in this directory)

### Key Log Lines (from `ci-logs/run-22410298646.log`)

```
3383: Auto Release  ##[group]Run node scripts/publish-crate.mjs
3393: Auto Release  node:internal/errors:984
3397: Auto Release  Error: Command failed: npm show command-stream version
3398: Auto Release  npm error code E403
3399: Auto Release  npm error 403 403 Forbidden - GET https://registry.npmjs.org/command-stream
3414: Auto Release  cmd: 'npm show command-stream version',
3425: Auto Release  ##[error]Process completed with exit code 1.
```

---

## Proposed Solutions

### Solution 1 (Implemented): Pin `command-stream` Version in `use-m` Calls ✅

**Fix:** Change `use('command-stream')` to `use('command-stream@0.9.4')` (or latest known version) in all scripts.

**How it works:** When a pinned version is specified, `use-m` skips the `npm show` call:
```javascript
// use-m source code:
if (version !== 'latest' && await directoryExists(packagePath)) {
  return packagePath; // Skip npm show entirely!
}
```

This eliminates the `npm show` registry call that triggers the 403 error.

**Trade-off:** Scripts must be updated when `command-stream` releases a new version.

**Files changed:**
- `scripts/publish-crate.mjs`: `use('command-stream')` → `use('command-stream@0.9.4')`
- `scripts/check-release-needed.mjs`: `use('command-stream')` → `use('command-stream@0.9.4')`
- `scripts/version-and-commit.mjs`: `use('command-stream')` → `use('command-stream@0.9.4')`

### Solution 2 (Alternative): Report Issue to `use-m`

File an issue at https://github.com/link-foundation/use-m requesting:
1. Time-based caching for `@latest` lookups (partially tracked in issue #40)
2. Error handling in `getLatestVersion()` to gracefully handle registry failures
3. A `--registry` option to override registry URL

**Benefit:** Fixes the root cause in the shared library, benefiting all users.

**Limitation:** Requires upstream action and may take time to implement.

### Solution 3 (Alternative): Pre-install Dependencies

Add a step to the `auto-release` job that pre-installs `command-stream` globally before any scripts run:

```yaml
- name: Pre-install use-m dependencies
  run: npm install -g command-stream
```

**Limitation:** Still relies on `npm show` if `use-m` is used afterward.

### Solution 4 (Alternative): Use `npm config set registry`

Add `--registry https://registry.npmjs.org` to the `npm show` command. However, this requires modifying `use-m` source.

---

## Additional Findings

### `use-m` Issue Tracker

Related upstream issues:
- https://github.com/link-foundation/use-m/issues/40 — "Add caching support for non-specific package versions" (WIP, not merged)
- https://github.com/link-foundation/use-m/issues/17 — Related to repeated installs

### npm Registry Status

`command-stream` on npm registry (as of 2026-02-25):
- **Latest version:** `0.9.4`
- **All versions:** `0.0.1` through `0.9.4`
- **Accessibility:** Public, accessible without authentication at `https://registry.npmjs.org/command-stream`
- **Maintainer:** `link-foundation` organization

---

## Recommendations

1. **Immediate fix (implemented):** Pin `command-stream` version in all `use-m` calls to bypass `npm show` registry queries.

2. **Medium-term:** File issue on `use-m` GitHub repository requesting caching support for `@latest` lookups and better error handling for registry failures.

3. **Long-term:** Consider migrating from `use-m` dynamic loading to explicit `package.json` dependencies with `npm install` step in workflow, which is more reliable and cacheable.
