# Issue 62 Browser CDN Resolver Case Study

Issue: https://github.com/link-foundation/use-m/issues/62
Pull request: https://github.com/link-foundation/use-m/pull/63
Investigation date: 2026-06-21

## Summary

`https://konard.github.io/links-visuals/` imported `use-m` from `https://esm.sh/use-m` and then called `use('d3')`. The esm.sh build of `use-m@8.14.1` exposed Node-like browser shims, including a process shim and a rewritten filename fallback. `use-m` trusted those shims as proof that it was running in Node.js, selected the npm/global-install resolver, and reached `node:child_process` inside a browser. esm.sh served that Node module through unenv, where `child_process.exec` is intentionally unavailable in the browser, so the page stopped before rendering D3.

The fix makes browser globals authoritative over Node-like polyfill shims in `makeUse()` and ignores `global.__filename` when real browser globals are present. Browser and HTTP imports now stay on the CDN resolver chain even when a CDN/bundler provides `process.versions.node`.

## Evidence Stored Here

- `assets/issue-screenshot.png`: screenshot from issue #62, verified as a PNG by its signature.
- `assets/live-before.png`: live browser screenshot captured from `https://konard.github.io/links-visuals/` before the fix.
- `assets/links-visuals-index.html`: fetched HTML from the broken page.
- `assets/esm-sh-use-m-entry.mjs`: current esm.sh entry response for `https://esm.sh/use-m`.
- `assets/esm-sh-use-m-bundle.mjs`: current esm.sh bundled response for `use-m@8.14.1`.
- `ci-logs/live-before-console.log`: browser console/page-error output from the live site before the fix.
- `ci-logs/esm-sh-polyfill-browser-test.log`: focused browser-commander regression test.
- `ci-logs/sync-tests.log`: source/root mirror synchronization checks.
- `ci-logs/existing-browser-tests.log`: existing browser tests after the fix.
- `ci-logs/npm-test.log`: full Jest suite after the fix.
- `ci-logs/bun-test.log`: full Bun suite after the fix.
- `ci-logs/deno-test.log`: full Deno suite after the fix.
- `ci-logs/npm-install*.log`: dependency installation logs used during investigation.

## Timeline

- 2026-06-21 19:20 UTC: issue #62 was opened with a screenshot and console stack showing `[unenv] child_process.exec is not implemented yet!`.
- 2026-06-21 19:20 UTC: PR #63 was created from `issue-62-b423ddd03866`.
- Investigation reproduced the live failure in Chrome. The captured console shows the favicon 404 followed by `[unenv] child_process.exec is not implemented yet!` (`ci-logs/live-before-console.log`, lines 1-5).
- The live page HTML imports `use-m` from `https://esm.sh/use-m` and then calls `use('d3')` (`assets/links-visuals-index.html`, lines 46-49).
- The esm.sh entry imports `/node/process.mjs` before exporting the `use-m` bundle (`assets/esm-sh-use-m-entry.mjs`, lines 1-3).
- The esm.sh bundle rewrites the `global.__filename` fallback into `/use-m@8.14.1/es2022/use-m.mjs` and detects the process shim as Node-like, so the default resolver becomes `npm` instead of the browser CDN chain (`assets/esm-sh-use-m-bundle.mjs`, line 10).
- The new browser-commander regression test simulates the same `global.__filename` and `process.versions.node` shims and verifies that `use('d3')` resolves to `https://esm.sh/d3`, not a Node/npm path.

## Requirements From The Issue

- Make `use-m` work in all environments, including browser imports from esm.sh.
- Add browser e2e coverage using `browser-commander` so this class of regression is caught.
- Download logs/data related to the issue into `docs/case-studies/issue-62`.
- Reconstruct the timeline and requirements.
- Identify root causes and solution options.
- Search related online/project facts.
- Check whether related external projects need issue reports.

## Root Causes

1. `makeUse()` trusted `process.versions.node` even in a real browser.

   Browser CDNs can provide Node compatibility shims. A process shim is not proof that shell execution, npm, or Node built-ins are available.

2. `makeUse()` accepted `global.__filename` before checking whether it was running in a browser.

   In the esm.sh bundle, that fallback became `/use-m@8.14.1/es2022/use-m.mjs`, which had no HTTP protocol. Combined with the process shim, the resolver decision fell through to the npm resolver.

3. The npm resolver imports Node-only modules up front.

   Once the wrong resolver was selected, browser execution reached `node:child_process`. In the esm.sh/unenv browser shim, `exec` is not implemented, producing the issue's error.

## Solution Options Considered

- Force consumers to import `use-m` from unpkg or a local build. Rejected because browser CDN usage is an advertised use case and the library should handle CDN/bundler shims.
- Special-case esm.sh URLs. Rejected because the real problem is broader: any bundler/CDN can provide Node-like globals in a browser.
- Prefer browser globals over Node-like shims and ignore `global.__filename` in browsers. Selected because it fixes the environment contract directly and keeps Node, Bun, and Deno behavior unchanged.

## External Projects Checked

- `browser-commander`: https://github.com/link-foundation/browser-commander. Added as a dev dependency for the requested e2e browser coverage.
- `esm.sh`: https://esm.sh/ and https://github.com/esm-dev/esm.sh. The CDN supports browser ESM delivery and currently injects Node compatibility shims for this bundle. No matching existing issue was found for `use-m child_process exec unenv`.
- `unenv`: https://unjs.io/packages/unenv and https://github.com/unjs/unenv. unenv provides platform-agnostic Node compatibility shims; the observed `child_process.exec` error is expected once browser code incorrectly reaches a child-process API. No matching existing issue was found for this specific `use-m` failure.

No external issue was filed because the confirmed defect was in `use-m` environment detection. esm.sh and unenv exposed the failure, but the package should not select an npm/shell resolver inside a browser just because shims exist.

## Implementation

1. Added `hasBrowserGlobals` in `src/use.mjs`, `src/use.cjs`, and `src/use.js`.
2. Guarded the `global.__filename` fallback so it is used only outside real browser globals.
3. Made browser detection happen before Node detection, so `window` + `document` keeps browser imports on `networkResolverChain` even when `process.versions.node` exists.
4. Ran `npm run sync:entries` so root `use.js`, `use.cjs`, and `use.mjs` mirrors match `src/`.
5. Added `tests/browser-server/esm-sh-polyfill-browser.test.html`.
6. Added `tests/esm-sh-polyfill-browser.test.mjs`, which uses `browser-commander` around a real Chrome/Puppeteer page.
7. Added `browser-commander` to dev dependencies and lockfiles.

## Verification

- Focused browser regression: `npm test -- tests/esm-sh-polyfill-browser.test.mjs --runInBand` passed (`ci-logs/esm-sh-polyfill-browser-test.log`, lines 7-15).
- Sync checks: `npm test -- tests/script-sync.test.mjs tests/root-entries.test.mjs --runInBand` passed.
- Existing browser checks: `PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome npm test -- tests/builtin-browser.test.mjs tests/relative-paths-browser.test.mjs --runInBand` passed.
- Full Jest suite: `PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome npm test -- --runInBand` passed 45 suites and 331 tests (`ci-logs/npm-test.log`, lines 112-121).
- Full Bun suite: `PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome bun test` passed 331 tests (`ci-logs/bun-test.log`, lines 449-452).
- Full Deno suite: `deno test --allow-net --allow-env --allow-run --allow-read --allow-write --allow-sys` passed 32 modules with 173 steps (`ci-logs/deno-test.log`, lines 419-422).
