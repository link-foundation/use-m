# Issue 50 Hardcoded Built-in Modules Case Study

## Summary

Issue 50 reported that `use-m` should not keep its own list of Node.js built-in modules, because the host runtime already publishes that list through `node:module`. The library shipped a `supportedBuiltins` object with 25 entries across 233 lines, while Node.js 24.21.0 reports 72 built-in modules, Bun 1.4.2 reports 76 and Deno 2.9.6 reports 68. Everything outside those entries was not treated as a built-in at all: the built-in resolver returned `null` for it and the specifier fell through to the npm and CDN resolvers. Measured against Node.js 24.21.0, the resolver claimed 24 of the 72 built-ins and handed the other 48 — `tty`, `cluster`, `worker_threads`, `vm`, `readline`, `string_decoder`, `timers`, `perf_hooks`, `node:sqlite`, `node:test` and 38 more — to npm. After the fix it claims all 72.

The fix asks the runtime instead. `module.isBuiltin()` decides whether a specifier is a built-in, and a single generic loader imports it. What remains hardcoded is only what cannot be derived at runtime: browser implementations for `console`, `crypto`, `url` and `performance`, the list of built-ins that have no browser implementation (browsers have no `node:module` to ask), and a Bun/Deno `fs/promises` compatibility path whose contents are now also read from the runtime rather than listed.

## Evidence Stored Here

- `github-data/issue-50.json`: issue title, body, author, and state.
- `github-data/issue-50-comments.json`: issue comments, including the case study request.
- `github-data/pr-51.json`: PR metadata and commit list.
- `github-data/pr-51-comments.json`: PR conversation comments.
- `github-data/pr-51-review-comments.json`, `github-data/pr-51-reviews.json`: empty at investigation time, kept to show no inline review feedback exists.
- `ci-logs/pr-branch-runs.json`: every workflow run recorded for the PR branch.
- `ci-logs/run-20503796894*.json`, `run-20503954908*.json`, `run-20503980547*.json`: run and job metadata for the three failing `Tests` runs.
- `ci-logs/job-58915164270-deno-log-expired.txt`: proof that GitHub returned HTTP 410 for the failing December 2025 job logs (they are past their retention window).
- `ci-logs/local-repro-deno-base-3ca349ad.log`: local re-run of the failing CI command at the branch base commit, before any implementation change.
- `ci-logs/local-repro-before.log`, `ci-logs/local-repro-after.log`: `experiments/builtin-coverage.mjs` run against `origin/main` and against this branch, showing built-in coverage going from 24/72 to 72/72.
- `ci-logs/npm-test.log`, `ci-logs/bun-test.log`, `ci-logs/deno-test.log`: full local test runs after the fix.
- `ci-logs/run-35059338927.log`, `ci-logs/run-35059338927.json`: the passing CI/CD run for this branch after the fix.
- `ci-logs/run-35074309628.log`, `ci-logs/run-35074309628.json`: the passing CI/CD run on the widened matrix — ten jobs across Ubuntu and macOS, Node.js 20/22/24, Bun and Deno.
- `runtime-evidence/builtin-detection-node.log`, `-bun.log`, `-deno.log`: what each runtime reports for `builtinModules.length` and `isBuiltin()` on the interesting specifiers.
- `runtime-evidence/fs-promises-arity-probe.log`: callback vs promise arities and constructors of `node:fs` / `node:fs/promises` per runtime, the measurement behind the `fs/promises` override.
- `runtime-evidence/generic-builtin-loader-*.log`: output of `experiments/generic-builtin-loader.mjs` on each runtime, showing the generic loader reproduces every previously hardcoded entry.
- `ci-logs/node-v18.20.8.log`, `node-v20.20.2.log`, `node-v22.23.2.log`, `node-v24.21.0.log`, `node-v26.8.2.log`: `experiments/verify-node-lts.sh` output per Node.js version — the backward-compatibility experiment plus the eleven built-in test files.
- `ci-logs/node-v20-full-suite.log`, `ci-logs/node-v22-full-suite.log`, `ci-logs/node-full-suite.log`: the whole jest suite on Node.js 20.20.2, 22.23.2 and 24.21.0 after the fix.
- `ci-logs/node-full-suite-main-baseline.log`: the same suite on `main` in the same environment, for comparison.
- `ci-logs/bun-full-suite.log`, `ci-logs/deno-full-suite.log`: the whole suite under Bun 1.4.2 and Deno 2.9.6 after the fix.
- `runtime-evidence/backward-compat-node.log`, `-bun.log`, `-deno.log`: `experiments/builtin-backward-compatibility.mjs` comparing `main`'s resolver with this branch's for all 25 previously hardcoded specifiers on each runtime.
- `runtime-evidence/backward-compat-bun-before-clamp.log`, `-deno-before-clamp.log`: the same comparison before the `fs/promises` arity clamp, the measurement that exposed the `stat` and `truncate` regressions.

## Timeline

- `2025-08-15T21:07:03+05:30`, commit `0e6a3f4` "feat: Add support for built-in modules across environments" introduced `supportedBuiltins` with one entry per module and a `browser` / `node` factory pair per entry.
- `2025-12-25T10:42:16Z`: `klntsky` opened issue 50, pasting the 70-name output of `(await import('node:module')).builtinModules` as the list that should be used instead.
- `2025-12-25T10:43:01Z`: `konard` replied that this is useful for reducing download size, and asked for all related logs and data to be compiled into `docs/case-studies/issue-50` and used for a deep case study.
- `2025-12-25T10:43:27Z`, commit `3ca349ad`: branch `issue-50-05d4b42f950f` created with task details only (a `CLAUDE.md` file, no library change). The `Tests` workflow run `20503796894` failed on both Deno jobs; Node and Bun passed.
- `2025-12-25T10:56:33Z`, commit `020fb1d9` "feat: implement dynamic builtin module detection": first draft implementation. `Tests` run `20503954908` failed on the same two Deno jobs.
- `2025-12-25T10:59:29Z`, commit `53e9f7f1` reverted the task-details commit. `Tests` run `20503980547` again failed only on Deno.
- `2025-12-25T10:59:37Z`: the draft session ended and its log was posted to PR 51.
- `2026-06-15`, commit `850d4c6`: unrelated work for issue 60 moved the sources into `src/` and made the root `use.{mjs,cjs,js}` generated mirrors. The PR branch predates this, which is what later made PR 51 report a dirty merge state.
- `2026-09-16T05:00:02Z`: `konard` asked to re-check, on the current code, whether hardcoded built-ins can be safely replaced with dynamic loading, keeping custom overrides only where needed, "to make the code even shorter".
- `2026-09-16T05:03:07Z`, commit `c64a1be`: `main` merged into the PR branch; the conflicting root entry files were taken from `main` and regenerated from `src/` afterwards.
- `2026-09-16`: the implementation was rewritten against the `src/` layout, the `fs/promises` arity table was replaced with runtime-derived values, and the three runtimes were re-verified locally.

## Root Causes

1. **One table served two unrelated questions.** `supportedBuiltins` answered both "how do I polyfill this in a browser" and "how do I import this in Node.js". The browser side genuinely has to be written down, because a browser has no `node:` namespace. Entangling it with the Node.js side forced the Node.js side to be written down too, and made adding a built-in a two-environment edit.
2. **The Node.js side of every entry was the same one-liner.** All 25 `node` factories were variations of `import('node:<name>')` followed by `{ default: m, ...m }`. Because ESM spreads the namespace after `default`, a CJS built-in's own default export (`node:events` to `EventEmitter`, `node:stream` to `Stream`, `node:assert` to the assert function) already wins without per-module code. The hand-written factories were reproducing behavior the language already provides.
3. **Unlisted built-ins silently became package names.** The resolver returned `null` for anything missing from the table, so `use('tty')`, `use('worker_threads')` or `use('node:vm')` were handed to the npm and CDN resolvers instead of failing or loading the real built-in.
4. **The list could never be complete.** `builtinModules` grows with each Node.js release, and three runtimes disagree about its contents, so no committed list can match the runtime the code is executing in.
5. **The `fs/promises` entry hardcoded an arity table for a runtime difference.** Bun and Deno do need a promisified `node:fs` wrapper, but the fix listed 29 function names with hand-written argument counts, several of which did not match Node's real arities (`access`, `stat`, `lstat`, `truncate` and `statfs` are 1 in Node 24, the table claimed 2).
6. **The failing CI checks on PR 51 were not caused by the change.** The same two Deno jobs failed at commit `3ca349ad`, which contained no library change, and the `Tests` workflow itself no longer exists on `main` (it was replaced by the `CI/CD` workflow in `release.yml`). Re-running the exact December command at that commit today fails with a `deno.lock` integrity error against a rebuilt `esm.sh` artifact, an infrastructure-level cause unrelated to built-in modules.

## What the Runtimes Actually Report

`runtime-evidence/builtin-detection-*.log`, collected on Node.js v24.21.0, Bun 1.4.2 and Deno 2.9.6:

| specifier | Node.js | Bun | Deno |
| --- | --- | --- | --- |
| `builtinModules.length` | 72 | 76 | 68 |
| `isBuiltin('fs')` | true | true | true |
| `isBuiltin('node:sqlite')` | true | true | true |
| `isBuiltin('sqlite')` | false | false | **true** |
| `isBuiltin('node:sea')` | true | false | false |
| `isBuiltin('test')` | false | false | false |
| `isBuiltin('lodash')` | false | false | false |

Two consequences drove the implementation:

- `node:sqlite` and `node:test` are built-in only with the prefix, so the resolver has to ask about the specifier exactly as written. Otherwise `use('test')` or `use('sqlite')` would stop resolving the npm packages of those names.
- The runtimes disagree (Deno answers `true` for bare `sqlite`). `use-m` follows whatever the host runtime answers, which is the same answer the host's own `import` would give.

## Online Documentation Checked

- `module.builtinModules`, added in Node.js v9.3.0 / v8.10.0 / v6.13.0, and since v23.5.0 "the list now also contains prefix-only modules": https://nodejs.org/api/module.html
- `module.isBuiltin(moduleName)`, added in Node.js v18.6.0 / v16.17.0, documented with exactly the `isBuiltin('node:fs') === true`, `isBuiltin('wss') === false` semantics this fix relies on: https://nodejs.org/api/module.html
- `builtin-modules`, the popular static npm alternative, which ships a committed JSON list and therefore has the same drift problem this issue describes: https://github.com/sindresorhus/builtin-modules

## Options Considered

1. **Keep the table and extend it.** Rejected: it does not fix drift, and the list would have to be re-checked on every Node.js, Bun and Deno release.
2. **Ship `builtinModules` as a committed constant.** Rejected for the same reason, plus it would be wrong for the runtime actually executing the code, which is exactly where the three runtimes disagree.
3. **Use `builtinModules.includes(name)` for detection.** Rejected as the primary check: before Node.js v23.5.0 the array omits prefix-only modules, so `node:test` would not be detected. It is kept as a fallback for runtimes without `isBuiltin`.
4. **Use `isBuiltin()` and a single generic loader, keeping overrides only where a runtime difference is proven.** Selected.
5. **Derive the browser list at runtime too.** Impossible: a browser has no `node:module`. The list of built-ins with no browser implementation stays written down, and is the only list left.
6. **Drop the Bun/Deno `fs/promises` wrapper.** Rejected: `runtime-evidence/fs-promises-arity-probe.log` shows Bun's `fsp.readFile.length` is 1 and Deno exposes plain `Function` instead of `AsyncFunction` for most of the promise API, which breaks callers that inspect signatures.
7. **Keep the wrapper but derive it from the runtime.** Selected: the wrapper now walks the runtime's own `node:fs/promises` exports and takes each argument count from the matching `node:fs` callback function, so no function names or arities are listed in `use-m`.

## Implemented Solution

- Replaced `supportedBuiltins` (25 entries, 233 lines) with `builtinOverrides`, which holds 5 entries and only the parts that cannot be derived: browser implementations for `console`, `crypto`, `url`, `performance`, the Node.js mapping of `performance` onto `node:perf_hooks`, and the Bun/Deno `fs/promises` path.
- Added `isBuiltinModule()`, which resolves `module.isBuiltin` once and falls back to a `module.builtinModules` lookup, and answers `false` where `node:module` does not exist.
- Added `loadBuiltinModule()`, a single `import('node:' + name)` returning `{ default: m, ...m }`, used for every built-in without an override.
- The resolver asks about the specifier as written, so bare `test` and `sqlite` keep resolving to npm packages wherever the runtime says they are not built-in.
- Kept `browserUnavailableBuiltins`, the 21 module names that previously had `browser: null`, so browsers still get the explicit "not available in browser environment" error instead of an opaque CDN failure.
- Rebuilt the Bun/Deno `fs/promises` compatibility layer from the runtime's own exports, with argument counts taken from the callback API and a rest parameter so arguments beyond the declared count are still forwarded (the previous fixed-arity wrappers silently dropped them).
- Regenerated the root `use.{mjs,cjs,js}` mirrors with `npm run sync:entries`.

## Verification

- `tests/dynamic-builtins.test.mjs` / `.cjs` load `tty`, `cluster`, `readline`, `string_decoder`, `timers`, `worker_threads` and `vm`, none of which existed in the old table, assert that every name in `builtinModules` is claimed by the resolver, and assert that prefix-only built-ins do not shadow npm packages.
- `tests/fs-promises.test.mjs` additionally asserts that the rebuilt promise API exposes every function the runtime ships and forwards arguments past the declared arity.
- `experiments/builtin-coverage.mjs` reports coverage against any copy of `src/use.mjs`, which is how the 24/72 and 72/72 numbers above were measured.
- Full suites were run on Node.js v24.21.0, Bun 1.4.2 and Deno 2.9.6; Node.js reports 381 passed / 4 failed, Bun 381 passed / 4 failed and Deno 32 test files passed / 1 failed (200 steps passed, 2 failed). Every failure is the same pre-existing `--experimental-network-imports` case, which also fails on `origin/main` because Node.js 24 removed that flag. See `ci-logs/`.
- GitHub Actions run [35059338927](https://github.com/link-foundation/use-m/actions/runs/35059338927) is green on all six jobs (Node.js, Bun and Deno on ubuntu-latest and macos-latest), reporting 385 passed / 385 total, which confirms the four local failures are the Node.js 24 flag removal and nothing else. Logs: `ci-logs/run-35059338927.log`, metadata: `ci-logs/run-35059338927.json`.

## Backward Compatibility Review (2026-09-16)

`konard` asked on PR 51 to double-check that backward compatibility is preserved, that the change does not affect the current LTS lines of Node.js, Bun and Deno, and that the test coverage is enough to guarantee it. This section records what was measured rather than what was expected.

### How it was measured

`experiments/builtin-backward-compatibility.mjs` imports `main`'s entry file and the branch's entry file into the same process and calls `resolvers.builtin()` on both for each of the 25 specifiers the old `supportedBuiltins` table served, bare and `node:`-prefixed. For every specifier it compares the key set of the returned object and a description — type, function name, declared arity — of every value, and prints one `DIFF` line per difference. It runs on whichever runtime starts it:

```
git show main:src/use.mjs > /tmp/use-baseline.mjs
node experiments/builtin-backward-compatibility.mjs          # or bun run / deno run --allow-all
```

`experiments/verify-node-lts.sh` repeats that experiment and the eleven built-in test files under several Node.js binaries, writing one log per version into `ci-logs/`.

### Node.js: no observable difference on any line

| Node.js | differences vs `main` | built-in test files |
| --- | --- | --- |
| v18.20.8 | 0 | 11 suites, 161 tests passed |
| v20.20.2 (Iron) | 0 | 11 suites, 161 tests passed |
| v22.23.2 (Jod) | 0 | 11 suites, 161 tests passed |
| v24.21.0 (Krypton) | 0 | 11 suites, 161 tests passed |
| v26.8.2 (Current) | 0 | 11 suites, 161 tests passed |

Zero is the expected result and the reason is structural: on Node.js every one of the 25 specifiers now goes through the generic loader, which returns `{ default: m, ...m }` — character for character what all 25 removed `node` factories did. `performance` is the single Node.js-side override left, and it maps onto `node:perf_hooks` exactly as before. v18.20.8 additionally exercises the `module.builtinModules` fallback path for runtimes that predate `module.isBuiltin()`.

### Bun and Deno: `fs/promises` was the only module that moved

Those two runtimes are the only ones with an override, and every difference the experiment reported is inside it: 4 lines on Bun and 8 on Deno, all of them `fs/promises`, in both the bare and the `node:`-prefixed form. Two of the Deno ones were genuine regressions introduced by the first dynamic draft (`3895ecc`), found by measurement and fixed by clamping the derived arity. The notation below is the experiment's own — `name/declared parameter count`:

| runtime, export | `main` (hardcoded) | `3895ecc` (first draft) | after the fix | verdict |
| --- | --- | --- | --- | --- |
| Deno `stat` | `stat/2` | `stat/0` | `stat/1` | regression, fixed |
| Deno `truncate` | `truncate/2` | `truncate/0` | `truncate/1` | regression, fixed |
| Bun `lchmod` | `undefined` | `lchmod/2` | `lchmod/2` | addition |
| Deno `lchmod` | `undefined` | `<anonymous>/0` | `<anonymous>/0` | addition |
| Bun `watch` | `bound watch/3` | `watch/1` | `watch/1` | fix |
| Deno `watch` | `bound watch/3` | `watch/0` | `watch/0` | fix |

The regression's cause: the rebuild derives each wrapper's arity from the runtime's callback API (`fs.stat.length - 1`), and a callback API may declare fewer parameters than it accepts when the middle ones have defaults. `fs.stat.length` is 1 on Deno — and on Node.js — so the derived arity was 0, no wrapper matched, and the code fell back to the bare `promisify` result, which is a plain `Function` of length 0 rather than an `AsyncFunction`. The derived arity is now clamped into the range the wrappers cover, so a rebuilt entry is always an `AsyncFunction` declaring at least the path it operates on. The resulting `stat/1` and `truncate/1` match Node.js' own promise API, which the hardcoded `2` did not. Bun was never affected: it declares `fs.stat.length` as 3 — callback included — so the derived arity was 2 and a wrapper always matched. Node.js declares 1 like Deno, but never reaches the rebuild because its `node:fs/promises` is passed through untouched.

The other two differences are not regressions. `lchmod` was absent from the hardcoded table, so `use('fs/promises').lchmod` used to be `undefined` and is now whatever the runtime ships — Bun's own promisified `lchmod`, and on Deno the runtime's own export, which stays as it is because Deno has no `fs.lchmod` callback API to rebuild from. `watch` was `fs.watch` bound to `fs` — a callback API with a different contract from the promise one — and is now the runtime's own promise watcher, as on Node.js; `tests/fs-promises.test.mjs` pins that.

Evidence: `runtime-evidence/backward-compat-{node,bun,deno}.log` and `runtime-evidence/backward-compat-{bun,deno}-before-clamp.log`.

### Test coverage added for the guarantee

- `tests/builtin-backward-compatibility.test.mjs` / `.cjs` (34 tests each, 68 in total) state the contract of all 25 formerly hardcoded specifiers: the documented exports of each, bare and prefixed; that the builtin resolver claims every one of them instead of handing it to npm; that the resolved object carries every named export of the runtime's own module; that the runtime's own `default` survives the loader; the historical `events` → `EventEmitter`, `stream` → `Stream` and callable-`assert` defaults; the thirteen `process` properties the removed Deno branch copied by hand; `performance.now()`; that a rebuilt module still carries exactly the runtime module's exports at the top level and under `default`; and that bare and `node:`-prefixed specifiers resolve alike.
- `tests/fs-promises.test.mjs` (9 tests) pins Node.js' arities for 20 functions, the `AsyncFunction` / name / arity contract of everything use-m rebuilds, `watch` being the promise watcher rather than `fs.watch`, and an end-to-end round trip — `mkdtemp`, `mkdir`, `writeFile`, `appendFile`, `readFile`, `copyFile`, `rename`, `readdir`, `truncate`, `stat`, `access`, `realpath`, `rm` — through the rebuilt wrappers.
- The suites run on all three runtimes; the `.cjs` mirrors additionally cover the CommonJS entry file.

### CI now covers the Node.js lines instead of one

Which modules are built in is the runtime's answer now, so the runtime version is part of the contract, and the matrix tested only `20.x`. The test job runs `20.x`, `22.x` and `24.x`; Bun and Deno execute the suite with their own runtime (`bun-version: latest`, `deno-version: v2.x`) and stay pinned to one Node.js for `npm ci`, so the matrix grows by four jobs rather than twelve. `tests/release-workflow-policy.test.mjs` asserts that shape.

That extension exposed an unrelated blocker: `--experimental-network-imports` was removed in Node.js 22, so `tests/network-imports.*` failed on the newer lines — and on `main` too, for the same reason, whenever the suite runs on a modern Node.js. Those tests now probe for the flag and skip only when Node.js itself rejects the option; any other failure still fails the test.

### Full-suite results

| runtime | result | log |
| --- | --- | --- |
| Node.js v20.20.2 | 49 suites, 458 tests passed | `ci-logs/node-v20-full-suite.log` |
| Node.js v22.23.2 | 49 suites, 456 tests passed, 2 npm-registry timeouts | `ci-logs/node-v22-full-suite.log` |
| Node.js v24.21.0 | 49 suites, 458 tests passed | `ci-logs/node-full-suite.log` |
| Bun 1.4.2 | 458 tests passed, 0 failed | `ci-logs/bun-full-suite.log` |
| Deno 2.9.6 | 34 test files passed, 241 steps, 0 failed | `ci-logs/deno-full-suite.log` |

The two Node.js 22 failures are `tests/lodash.test.mjs` "npm: lodash" and `tests/use.test.cjs` "use.all", both of which exceeded the 5 s per-test limit while fetching from the npm registry. Re-running exactly those two files on the same binary passes (2 suites, 21 tests), and the appendix of that log records the re-run. Neither test touches built-in modules.

For comparison, `ci-logs/node-full-suite-main-baseline.log` is the same suite on `main` in the same environment: 19 failures, all of them the browser suites (Chrome was not yet installed for Puppeteer at that point) and the four `--experimental-network-imports` tests that Node.js 24 can no longer run. Both causes are environmental, and both are gone in the branch runs above.


### CI run on the widened matrix

Run [35074309628](https://github.com/link-foundation/use-m/actions/runs/35074309628) on commit `a09e0e6`: ten jobs, all green — Node.js 20.x, 22.x and 24.x on `ubuntu-latest` and `macos-latest` (458 tests each), Bun on both operating systems (458 pass, 0 fail) and Deno on both (34 files, 241 steps, 0 failed). Logs: `ci-logs/run-35074309628.log`.

## Size Effect

`konard` asked for this mainly to reduce what users download.

| file | before | after |
| --- | --- | --- |
| `src/use.mjs` lines | 1556 | 1442 |
| `src/use.mjs` bytes | 60962 | 57590 |
| `src/use.mjs` gzip -9 bytes | 15148 | 15233 |

Raw size drops by 3372 bytes (5.5%) per entry file. Compressed size is essentially unchanged (+85 bytes): the deleted table was highly repetitive and compressed extremely well, while the replacement adds unique prose comments. The durable wins are correctness and maintenance, not transfer size.
