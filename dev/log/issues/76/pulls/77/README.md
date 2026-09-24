# Issue #76 case study: false positives, false negatives, warnings and errors in CI/CD

Issue: https://github.com/link-foundation/use-m/issues/76 · Pull request: https://github.com/link-foundation/use-m/pull/77

## Collected data

| Path | Contents |
| --- | --- |
| `recent-runs.json` | Recent `CI/CD` workflow runs |
| `ci-logs/ci-cd-36042299802-full.log`, `-failed.log`, `annotations-36042299802.tsv` | Failed main push run for c1a48b0, with its annotations |
| `ci-logs/ci-cd-35580001347-failed.log` | Publish job for 8.16.1: published, verification failed |
| `ci-logs/ci-cd-35646023583-failed.log` | Publish job for 8.16.2: published, verification failed |
| `data/npm-time.json` | npm `time` field: when npm recorded each version |
| `data/releases.txt`, `data/remote-tags.txt` | GitHub releases and tags when the investigation started |
| `data/backfill-dry-run.txt` | `node scripts/npm-release.mjs backfill --dry-run` against the real registry |
| `data/registry-cache-headers.txt` | CDN cache headers of registry documents |
| `data/actionlint-*.txt`, `data/zizmor-*.txt` | Workflow lint findings before and after this pull request |
| `data/hive-mind-CI-CD-BEST-PRACTICES.md` | The referenced best-practices document |
| `template/file-tree.txt` | File tree of link-foundation/js-ai-driven-development-pipeline-template |

## Timeline

All times are UTC. The npm time is npm's own `time` field.

| When | Event |
| --- | --- |
| 2026-09-16 08:41 | 8.16.0 published, tagged and released normally. |
| 2026-09-21 08:52:34 | Run 35580001347: `npm publish` prints `+ use-m@8.16.1`. |
| 2026-09-21 08:54:17 | The same run gives up after 10 × `npm view` + `sleep 10`: "Failed to verify use-m@8.16.1 on npm." The tag and release steps never run. |
| 2026-09-21 08:55:10 | npm records 8.16.1, 156 s after publishing. |
| 2026-09-21 19:40:23 | Run 35646023583: `+ use-m@8.16.2`. |
| 2026-09-21 19:42:06 | The run gives up the same way. |
| 2026-09-21 19:45:33 | npm records 8.16.2, 310 s after publishing. |
| 2026-09-22 03:28 | 8.16.3 is published, tagged and released; the delay was short enough this time. |
| 2026-09-24 18:35 | Run 36042299802 on main (c1a48b0, version 8.16.4) fails in `Test on node 20.x (windows-latest)`. `tests/lodash.test.mjs` hits "Exceeded timeout of 5000 ms for a test" while installing lodash from npm. Publishing is skipped, so 8.16.4 is never released. |

Result: 8.16.1 and 8.16.2 are on npm without a `v8.16.1`/`v8.16.2` tag or GitHub release, and 8.16.4 is unpublished.

## Findings from the main run's logs and annotations

| Kind | Finding | Root cause |
| --- | --- | --- |
| False negative (red run, healthy code) | `lodash.test.mjs` timeout on Windows + Node 20 | Jest's default 5 s per-test timeout. A real `npm install` from the registry on a Windows runner takes longer. |
| False negative (found on this pull request) | [Run 36050374345](https://github.com/link-foundation/use-m/actions/runs/36050374345): `resolvers.test.mjs` "Exceeded timeout of 10000 ms" on Windows + Node 22 and 24 (`ci-logs/ci-cd-36050374345-failed.log`) | `tests/resolvers.test.{mjs,cjs}` called `jest.setTimeout(10000)`, which overrides the global budget for a real lodash install. |
| Latent false negative | Bun tests also ran with a 5 s timeout although `bunfig.toml` set `timeout = "30000ms"`. Locally, `lodash.test.mjs` timed out under `bun test`. | Bun has no test timeout setting in `bunfig.toml` and ignores the key silently. Only `bun test --timeout` works ([Bun docs](https://bun.sh/docs/test/runtime-behavior#test-timeouts); `data/bunfig-timeout-experiment.txt`). |
| False negative | Publish jobs of 8.16.1 and 8.16.2 failed although both publishes succeeded | Verification allowed about 100 s. npm needed 156 s and 310 s to process the versions. `npm view` also reads the full package document, which the registry CDN caches for up to 300 s (`cf-cache-status: HIT`, `age: 297`), which can add up to 5 minutes. |
| Missing release artifacts | No tag or release for 8.16.1 and 8.16.2 | The tag and release steps ran only after a successful verification, and nothing repaired them later. |
| Latent false positive | `npm view ... >/dev/null 2>&1` read any failure as "not published" | An unreachable registry would have led to a publish attempt and a conflict instead of a clear error. |
| Late failure | A merge without a version bump fails on main, after the merge | The version was checked only in the publish job. |
| Warning (15×) | `npm warn` about unapproved install scripts (esbuild, puppeteer) on every `npm ci` | npm 11 warns about packages with install scripts that are not in `allowScripts`. npm 12 blocks them, and puppeteer then has no browser. |
| Warning (18×) | `ExperimentalWarning: VM Modules is an experimental feature` | Jest needs `--experimental-vm-modules`, and Node prints the warning once per Jest worker. |
| Warning (27×) | `DeprecationWarning` for `sys` (DEP0025), `punycode` (DEP0040) and `_stream_wrap` (DEP0125) | `tests/dynamic-builtins.test.*` deliberately loads every built-in module, including the deprecated ones. |
| Notice (every Linux job) | "The ubuntu-latest label will migrate to Ubuntu 26 beginning October 19, 2026" | Floating runner label. |
| Hint (every checkout) | `hint: Using 'master' as the name for the initial branch` | `actions/checkout` runs `git init` with Git's default settings. |
| Misleading job names | "Test on bun 20.x", "Test on deno 20.x" | The matrix Node.js version was in the name, but Bun and Deno run the tests with their own runtime. |
| Lint (baseline) | actionlint: 2 × SC2129. zizmor: 6 × unpinned-uses, 10 × template-injection, 2 × artipacked, 1 × adhoc-packages (`data/*-before.txt`) | No workflow linting in CI. |
| Unobservable failure mode | A job killed by `timeout-minutes` shows as cancelled, not failed | There was no single status gate. |

## Requirements from the issue and how each is met

| Requirement | Where |
| --- | --- |
| Find and fix all false positives, false negatives, warnings and errors in CI/CD | Table above. Each item is fixed by the commits of #77. |
| Compare with the JS pipeline template and reuse its practices | See "Template comparison" below. |
| Follow CI-CD-BEST-PRACTICES.md | Tested release script with injected fetch, exec and sleep; pinned runner; least-privilege, credential-free checkouts; workflow lint; status gate; shift-left version check; default-off verbose tracing (`NPM_RELEASE_VERBOSE=1`). |
| Report the same issue in the template | [template#197](https://github.com/link-foundation/js-ai-driven-development-pipeline-template/issues/197) already reports the short verification window. use-m's evidence was added there, including a 310 s delay beyond the 300 s the issue proposes. |
| Collect logs and data in `./dev/log/issues/76/pulls/77` | This directory. |
| Add debug output, off by default | `NPM_RELEASE_VERBOSE=1` traces every registry request and `gh`/`git` command in `scripts/npm-release.mjs`. |

## Solutions

1. **Test timeouts.** `jest.config.js` sets `testTimeout: 30000`, and CI runs `bun test --timeout 30000`, the same as the template. The ignored key is removed from `bunfig.toml`. The 10 s `jest.setTimeout` overrides in `tests/resolvers.test.{mjs,cjs}` are removed. `tests/test-runner-config.test.mjs` keeps the two budgets equal, fails if a timeout reappears in `bunfig.toml`, and fails if any test file lowers the budget with `jest.setTimeout`. `experiments/issue-76-bunfig-timeout.mjs` reproduces the ignored setting.
2. **Install-script warnings.** `package.json` has `"allowScripts": { "esbuild": true, "puppeteer": true }`.
3. **Expected runtime warnings.**
   - The `npm test` script adds `--disable-warning=ExperimentalWarning` and disables the three deprecation codes by code only (Node ≥ 20.11).
   - Under Bun, the built-ins test captures `process.emitWarning` for its own loop. Under Jest that doesn't work, because Jest hands tests a deep copy of `process` (`jest-util/createProcessObject`).
   - `experiments/issue-76-builtin-warnings.mjs` reproduces the warnings.
4. **Publish verification and missing releases.** `scripts/npm-release.mjs` is unit-tested in `tests/npm-release.test.mjs` with fake fetch, exec and clock:
   - `status` reports npm, tag and release state; an unreachable registry is an error, not "missing".
   - `wait` polls up to 15 minutes, bypassing the CDN cache.
   - `release` creates the tag and release through the GitHub API at the commit npm recorded (`gitHead`), so checkouts need no credentials.
   - `backfill` repairs every CI-published version whose `gitHead` is on main but has no tag or release. The dry run against the real registry finds exactly 8.16.1 and 8.16.2 (`data/backfill-dry-run.txt`). Versions npm recorded without a `gitHead`, such as 8.10.5, are not touched.
5. **Shift-left version check.** A `version-check` job fails pull requests whose `package.json` version is already on npm.
6. **Workflow hygiene.**
   - Pinned `ubuntu-24.04`.
   - `GIT_CONFIG_*` env sets `init.defaultBranch=main` for checkout.
   - `persist-credentials: false` everywhere.
   - Bun and Deno setup actions pinned by hash, with policy in `.github/zizmor.yml`.
   - The ad-hoc `npm install -g npm@^11.5.1` is replaced by a check: Node 24 already bundles npm 11.19.
   - Job names without the irrelevant Node.js version.
   - actionlint and zizmor run in a `workflow-lint` job; both report no findings after the change (`data/*-after.txt`).
   - A `pipeline-status` job fails when any job failed or was cancelled.
   - `tests/release-workflow-policy.test.mjs` pins all of this. Against the old workflow it fails 11 of its 17 tests.

## Template comparison

Adopted:
- `ubuntu-24.04`
- `bun test --timeout 30000`
- `GIT_CONFIG_COUNT`/`GIT_CONFIG_KEY_0`/`GIT_CONFIG_VALUE_0`
- `persist-credentials: false`
- digest-pinned actionlint
- `zizmor-action` v0.6.2 with zizmor 1.29.0 and the same hash-pin policy
- the `!cancelled()` pipeline status gate
- the version check on pull requests
- an HTTP registry check that separates 404 from errors (the template's `npm-registry.mjs` does the same)

Not adopted, and why:
- **Separate `workflows.yml`/`security.yml` files.** `tests/release-workflow-policy.test.mjs` keeps one workflow file since the trusted-publishing fix (315a90d), because npm trusts exactly one workflow file. The lint job lives in `release.yml`, and `npm audit --omit=dev` already runs on every CI run.
- **The 1500-line file limit.** The generated `use.js`/`use.cjs`/`use.mjs` bundles are about 1900 lines by design.
- **Changesets-based releases and job-level concurrency groups.** use-m releases by bumping `package.json`, and the workflow-level concurrency group already serializes main runs.

The template has the same verification defect: `publish-retry.mjs` polls for about 120 s, the smoke test retries for about 40 s, and both run before "Create GitHub Release". It also reads the CDN-cached package document. This is reported in template#197.

## Existing tools considered

- [`actionlint`](https://github.com/rhysd/actionlint) and [`zizmor`](https://github.com/zizmorcore/zizmor): used.
- `npm view`: replaced because it reads the cached package document and cannot tell 404 from network errors.
- [`changesets`](https://github.com/changesets/changesets) / [`semantic-release`](https://github.com/semantic-release/semantic-release) create tags and releases, but neither waits for npm's processing delay or repairs releases a failed run skipped. Adopting either would change use-m's release model for no gain on this issue.
- `gh release create --target` creates the tag server-side, so no git push credentials are needed.
