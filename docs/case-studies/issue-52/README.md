# Case Study: Issue #52 — `npm show` fails with 403 Forbidden in CI when loading `@latest` packages

> **Status:** investigation complete, no fix code yet.
> **PR:** [#53](https://github.com/link-foundation/use-m/pull/53) (DRAFT) — proposals only, awaiting solution selection.
> **Per maintainer instruction on the issue thread:** *"We should not code until solution is selected."* This document is the deliverable that lets the maintainer pick.

---

## 1. Problem statement

`use-m` v8.13.7 resolves an unpinned (`@latest`) package by shelling out to `npm show <pkg> version`. That single registry call has been observed to fail with two different errors on hosted CI runners, both of which abort whatever script imported `use-m`:

| Symptom | Trigger | Reported in |
| ------- | ------- | ----------- |
| **`E403 Forbidden` from `npm show`** | First/repeated `npm show <pkg> version` call inside a GitHub Actions job. The package itself is public; the same URL returns `200` from outside the runner. | `link-foundation/use-m#52` (this issue) — observed on `link-assistant/calculator` run [22410298646](https://github.com/link-assistant/calculator/actions/runs/22410298646/job/64881763135). |
| **`ENOTEMPTY: directory not empty, rmdir` from `npm install -g`** | Re-installing a global package whose previous install left files behind — npm's self-rmdir race. | `link-assistant/hive-mind#1724` (sister issue). Fixed downstream in [hive-mind#1725](https://github.com/link-assistant/hive-mind/pull/1725) by *pre-installing* every `@latest` package with retries before tests run. |

Both share the same architectural cause inside `use-m`: every `await use('<pkg>')` (no version) **always** issues a fresh `npm` subprocess; there is **no caching, no retry, no fallback to an already-installed copy, and no verbose mode** for diagnosing failures. Issue #52 is the registry-side symptom of that architecture; #1724 is the file-system-side symptom.

The maintainer reference in the issue comment ([here](https://github.com/link-foundation/use-m/issues/52#issuecomment-4345769753)) explicitly asks: *"Can we do something to solve that on the use-m side? What are possible solutions?"* — i.e., we want a fix in this repo, not just a downstream workaround.

---

## 2. Reconstructed requirements (from issue body + maintainer comment)

The issue + comment together impose seven requirements. Each is tracked through the rest of this document.

| # | Requirement | Source |
| - | ----------- | ------ |
| R1 | Identify the **root cause** of the 403 in CI. | Issue body §"Root Cause" + comment "find root causes". |
| R2 | Propose **possible solutions** on the `use-m` side (do **not** code yet). | Comment: *"We should not code until solution is selected."* |
| R3 | **Compile data** (logs + sources) under `./docs/case-studies/issue-{id}/`. | Comment paragraph 4. |
| R4 | Do a **deep case study**: timeline of events, list of all requirements, root causes, solution plans for each, library research. | Comment paragraph 4. |
| R5 | If we cannot pinpoint the root cause, **add debug output / verbose mode** so the next iteration can. | Comment paragraph 5. |
| R6 | If the issue touches **other repos**, file issues there with reproducer + workaround + suggested fix. | Comment paragraph 6. |
| R7 | Search **online** for additional facts and check **existing libraries** that solve similar problems. | Comment paragraph 4. |

---

## 3. Evidence package (R3 ✅)

Files under this directory:

```
docs/case-studies/issue-52/
├── README.md                                          ← this document (R3, R4)
├── logs/
│   ├── calculator-run-22410298646-full.log            ← failing run for issue #52, full job log (4303 lines)
│   ├── calculator-run-22410298646-head.log            ← first 500 lines (env, setup-node, checkout)
│   ├── hive-mind-run-25109962685.log                  ← failing run for sister issue #1724 (ENOTEMPTY)
│   └── hive-mind-run-25072975006.log                  ← earlier hive-mind failure (sibling symptom)
├── research/                                          ← reserved for online research notes (this iteration: see §7)
└── sources/
    ├── calculator-issue-76.json                       ← the calculator-side issue
    ├── calculator-issue-76-case-study.md              ← downstream case study
    ├── calculator-pr-77.json                          ← downstream fix (pinned versions)
    ├── calculator-ci-runs.json                        ← CI run metadata
    ├── hive-mind-issue-1724-case-study.md             ← sister case study (ENOTEMPTY)
    └── use-m-source-snapshot.js                       ← snapshot of https://unpkg.com/use-m/use.js at investigation time
```

Reproduction instructions (no fix, just to re-confirm):

```bash
gh run view 22410298646 --repo link-assistant/calculator --log-failed > /tmp/calc.log
grep -nE 'npm show|E403|publish-crate' /tmp/calc.log
```

You should see the `Auto Release` job's `Run node scripts/publish-crate.mjs` step abort at `2026-02-25T18:30:17Z` with `Error: Command failed: npm show command-stream version` / `npm error code E403` (lines 3393–3425 of the saved log).

---

## 4. Timeline (R4)

### 4.1 The failing job — `link-assistant/calculator` run 22410298646

All timestamps UTC, all line numbers from `logs/calculator-run-22410298646-full.log`.

| Time | Step | Outcome | Log line |
| ---- | ---- | ------- | -------- |
| 18:27:51 | `actions/setup-node@v4` configures Node 20.20.0 / npm 10.8.2 with `always-auth: false`, no `registry-url`, no `.npmrc` token written. | ✅ | 159–175 |
| 18:29:07 | `node scripts/git-config.mjs` → `await use('command-stream')` | ✅ | 3091 |
| 18:29:13 | `node scripts/get-bump-type.mjs` | ✅ | 3103 |
| 18:29:13 | `node scripts/check-release-needed.mjs` → `npm show command-stream version` returns the latest version, then `npm install -g command-stream-v-latest@npm:command-stream@latest` succeeds. | ✅ | 3155 |
| 18:29:15 | `node scripts/version-and-commit.mjs` → another `npm show` + `npm install -g`. | ✅ | 3170 |
| 18:29:16 | `node scripts/get-version.mjs` (no `use-m` call) | ✅ | 3223 |
| 18:29:16 → 18:30:16 | `cargo build --release` (~60s, no npm activity). | ✅ | 3236–3382 |
| **18:30:17.577** | **`node scripts/publish-crate.mjs` → `npm show command-stream version` → `403 Forbidden — GET https://registry.npmjs.org/command-stream` → throws → exit 1.** | ❌ | **3383–3425** |
| 18:30:17.582 | `Create GitHub Release` step is skipped, job marked failed. | — | 3426+ |

Verbatim error block (lines 3393–3422, abbreviated):

```text
Error: Command failed: npm show command-stream version
npm error code E403
npm error 403 403 Forbidden - GET https://registry.npmjs.org/command-stream
npm error 403 In most cases, you or one of your dependencies are requesting
npm error 403 a package version that is forbidden by your security policy, or
npm error 403 on a server you do not have access to.
npm error A complete log of this run can be found in:
  /home/runner/.npm/_logs/2026-02-25T18_30_17_302Z-debug-0.log
…
  cmd: 'npm show command-stream version',
  stdout: '',
  stderr: 'npm error code E403\n…'
```

### 4.2 What is *not* happening (ruled out by the log)

The most superficially plausible explanation — *"setup-node wrote an `_authToken` line to `~/.npmrc` and that token is being rejected by the registry"* — does not fit the evidence:

* `actions/setup-node@v4` was called with `always-auth: false` and **no `registry-url`** (line 162). Per the action source, both inputs default to false/empty, so no registry/auth lines are written to `.npmrc` (`actions/setup-node`'s `auth.ts` only writes when `always-auth=true` or `registry-url` is set).
* The npm error string says `403 Forbidden — GET https://registry.npmjs.org/<pkg>` against the **public** registry, not a private mirror.
* Earlier `npm show command-stream version` calls in the same job (≈ 18:29:13 and 18:29:15) **succeeded**. Whatever changed between 18:29:15 and 18:30:17 is the trigger.

### 4.3 What changed between the succeeding and failing call

In that one-minute gap:

1. `cargo build --release` ran for ~60s.
2. The runner made ~70 outbound HTTPS requests to `crates.io` while compiling (lines 3246–3334).
3. No npm subprocess ran during the gap.

So the difference is **not local config** — it is the registry's response to this runner's IP at the moment of the third `npm show`. That's a registry-side condition (rate limiting, transient 403, Cloudflare WAF), not a `use-m` config bug. The `use-m` bug is *that we have no defence against it* — no retry, no cache, no fallback.

### 4.4 The sister failure — hive-mind#1724

The same architectural weakness shows up as a different symptom on the install side. Reproduced verbatim from `sources/hive-mind-issue-1724-case-study.md`:

```text
[3/75] tests/test-active-branch-runs-buffer-1722.mjs
Error: Failed to install command-stream@latest globally.
  [cause]: Error: Command failed: npm install -g command-stream-v-latest@npm:command-stream@latest
  npm error code ENOTEMPTY
  npm error syscall rmdir
  npm error path /opt/hostedtoolcache/node/24.14.1/x64/lib/node_modules/command-stream-v-latest/js/src/commands
```

Same root architecture (no retry on the npm subprocess); a different npm-internal failure mode (npm self-rmdir race instead of registry 403). The hive-mind team fixed that downstream in PR #1725 by **pre-installing all `use-m @latest` packages with retries before tests run**, then relying on `use-m`'s `installedVersion === latestVersion` early-return to skip the install path entirely. That pattern is one of the proposals below (S1).

---

## 5. Root cause analysis (R1)

We split the cause into three layers because the fixes naturally line up against the layers.

### RC-A — `getLatestVersion` is unconditional and uncached

`use.mjs` lines 528–531:

```js
const getLatestVersion = async (packageName) => {
  const { stdout: version } = await execAsync(`npm show ${packageName} version`);
  return version.trim();
};
```

`ensurePackageInstalled` (lines 544–564) calls `getLatestVersion` every time `version === 'latest'`, even when:

* the package is already installed under the right alias and at the actually-latest version (we won't know that until *after* we call `npm show`),
* the same Node process resolved the same name 5 seconds ago,
* the network is unhealthy and a previous resolution result is on disk.

So **every CI script that does `await use('<pkg>')`** = one extra `npm show` registry RTT, with no memoisation across calls in the same process and no persistence across script invocations within the same job. In the calculator run, three sequential scripts each issued the same `npm show command-stream version`.

### RC-B — `npm show`/`npm install -g` are invoked with no retry, no fallback, no `--registry`

The same lines reveal three additional gaps:

1. **No retry.** `execAsync('npm show …')` — first failure throws.
2. **No graceful fallback.** If `npm show` fails but `installedVersion` is non-null on disk, we *could* return the on-disk path with a warning. Currently we throw.
3. **No registry override hook.** Users can't point `use-m` at a Cloudflare mirror, a corporate proxy, or `--prefer-offline` mode short of monkey-patching.

### RC-C — There is no debug/verbose mode

Search results in `use.mjs`:

```
112:  browser: () => ({ default: console, log: console.log, …, info: console.info }),
291:  env: process.env,
528:  const getLatestVersion = async (packageName) => { … }   // uses execAsync, no logging
544:  const ensurePackageInstalled = async (...) => { … }     // no logging
```

There is no `process.env.USE_M_DEBUG` check, no opt-in trace, no way for a CI operator to ask "show me every npm subprocess you run, with stdout+stderr". When something fails on a remote runner, the operator's only signal is the thrown `Error`. Requirement R5 is therefore unambiguously *yes, add this*, regardless of which fix from §6 the maintainer picks.

### Why the symptom is the 403 specifically (registry side)

The npm CLI fronts `npm show` with `npm-registry-fetch`, which makes an unauthenticated `GET https://registry.npmjs.org/<pkg>`. The npm registry is fronted by Cloudflare and applies per-IP and per-AS rate limits / abuse mitigations. GitHub-hosted runners share IP ranges across many concurrent jobs, so the runner's apparent IP can be transiently throttled. Cloudflare's response in that state is a `403 Forbidden` with the npm error template above — not a `429`, because npm's CLI surfaces whatever upstream HTTP status it receives. (References in §7.)

This explains why we observe 403 even though the same package responds 200 to a curl from a developer machine: rate limiting is per source IP/AS, not per package.

---

## 6. Proposed solutions (R2) — pick one or compose

Each proposal is independently shippable and addresses a different layer. They compose: S2 + S3 together would defuse both the 403 and the ENOTEMPTY symptoms simultaneously. S5 is the one we recommend committing **regardless** of which functional fix is chosen, because it costs almost nothing and unblocks future investigation (R5).

### S1 — *Downstream-only* (do nothing in `use-m`, document the workaround)

Pin every `use('<pkg>')` to `<pkg>@<version>` in user code. `use-m` already short-circuits in that case (lines 548–550):

```js
if (version !== 'latest' && await directoryExists(packagePath)) {
  return packagePath;   // never calls npm show, never calls npm install
}
```

* **Pro:** zero risk to `use-m`. Already proven in calculator PR #77.
* **Con:** every consumer is on the hook to update pins. Doesn't address the requirement *"can we do something on the use-m side?"*. Punts on R5.
* **Verdict:** keep as documented escape hatch in README; not sufficient as the primary fix.

### S2 — In-memory + on-disk cache for `getLatestVersion` (related: upstream issues [#17](https://github.com/link-foundation/use-m/issues/17), [#40](https://github.com/link-foundation/use-m/pull/40), [#36](https://github.com/link-foundation/use-m/pull/36))

Cache the `(packageName) → version` result for a configurable TTL (default proposal: 5 min) per process and on disk under `os.tmpdir()/use-m-cache/<pkg>.json`. `ensurePackageInstalled` reads the cache before shelling out to `npm show`.

```js
async function getLatestVersion(packageName, opts) {
  const cached = await readCache(packageName, opts.ttlMs);   // null if missing/expired
  if (cached) return cached;
  const fresh = await execNpmShow(packageName);
  await writeCache(packageName, fresh);
  return fresh;
}
```

* **Pro:** removes 90%+ of registry calls in jobs that load several packages or that re-run `use-m` across multiple scripts (the calculator pattern).
* **Pro:** existing PRs (#36 in-memory, #40 file-based) already prototype this. We can land a slim version that supersedes both, or finish whichever is closer.
* **Con:** doesn't help when the *first* `npm show` of a CI job hits a 403 — only subsequent ones in the same window.
* **Mitigation:** combine with S3 for the first-call case.

### S3 — Retry + fallback in `getLatestVersion` and `ensurePackageInstalled`

Wrap both `execAsync` calls with exponential backoff on a defined set of retryable failures. On the registry side: `E403`, `E429`, `E5xx`, `ETIMEDOUT`, `EAI_AGAIN`, `ECONNRESET`, `ENOTFOUND`. On the install side (covers #1724): `ENOTEMPTY`, `EBUSY`, `EPERM`. Default: 3 attempts, 250 ms → 1 s → 4 s, with jitter.

If `getLatestVersion` ultimately fails *and* `installedVersion` is non-null, **fall back to the installed version with a warning** rather than throwing. (Behavioural change, opt-in via `useFallbackOnRegistryError: true` to keep semver minor.)

* **Pro:** addresses both #52 (403) and #1724 (ENOTEMPTY) in one change.
* **Pro:** matches the pattern hive-mind#1725 already validated downstream — exponential backoff over a similar error allow-list.
* **Con:** hides transient infra problems unless verbose mode (S5) is also on. That's acceptable as long as S5 ships with it.

### S4 — Drop the `npm` CLI dependency for the version lookup

Replace `npm show <pkg> version` with a direct HTTPS GET to `https://registry.npmjs.org/<pkg>/latest` (returns JSON with a `version` field), or use the `package-json` / `latest-version` libraries (see §7). This removes:

* npm CLI startup cost (~300 ms),
* npm's auth/config handling that may interact with the runner's environment,
* the `npm error code E403` template (we get a clean HTTP status from `fetch`).

* **Pro:** smaller surface area. We control the User-Agent (avoids being lumped into "npm CLI on a noisy runner IP" rate-limit buckets) and can implement retry/cache trivially.
* **Pro:** opens the door to a `--registry` option (Cloudflare mirror at `https://registry.npmjs.cf` exists with CORS, useful for browser builds).
* **Con:** **install** still needs `npm install -g`; this only fixes the lookup. So S4 must be combined with S3 to address #1724.
* **Con:** users with `~/.npmrc` private-registry configs lose them for the lookup unless we also read npm config. The package `npm-registry-fetch` handles this for us if we want to keep parity.

### S5 — Verbose / debug mode (R5) — recommended **always**

Add `USE_M_DEBUG=1` (and `USE_M_DEBUG=2` for trace) gated logging behind a tiny `debug(label, msg)` helper:

```js
const debug = (process.env.USE_M_DEBUG ? (...args) => console.error('[use-m]', ...args) : () => {});

const getLatestVersion = async (packageName) => {
  debug('getLatestVersion', packageName);
  const t0 = Date.now();
  try {
    const { stdout, stderr } = await execAsync(`npm show ${packageName} version`);
    debug('  → ok', stdout.trim(), `${Date.now() - t0}ms`);
    return stdout.trim();
  } catch (err) {
    debug('  → fail', err.code, err.stderr?.split('\n')[0]);
    throw err;
  }
};
```

* **Pro:** ~30 lines, zero default overhead, immediately satisfies R5.
* **Pro:** unlocks future investigation if any of S2/S3/S4 turns out to be insufficient.
* **Con:** none worth listing.

### Recommended composition

| Pick | What ships | Risk | Issue requirement(s) covered |
| ---- | ---------- | ---- | ---------------------------- |
| **A (minimal)** | S5 only | Tiny | R5; lays the groundwork for an informed S2/S3/S4 decision later. |
| **B (target #52)** | S2 + S3 + S5 | Medium — touches install path, needs tests | R1 (mitigated), R2, R5; also incidentally helps #1724. |
| **C (full overhaul)** | S2 + S3 + S4 + S5 | Larger — replaces `npm show` with `fetch` | R1, R2, R5; lowest-future-flake outcome. |

We recommend **B**. It directly resolves the documented failure modes and reuses both an existing prototype (PR #40) and a battle-tested retry pattern (hive-mind#1725). S4 is a strictly larger change with diminishing returns once S2 has slashed call volume.

**Decision needed from @konard:** A, B, or C (or other). After selection, a follow-up PR implements it. This PR (#53) should land only the case study + S5.

---

## 7. Library research (R7)

Existing prior art that solved the same sub-problems:

| Need | Library / pattern | Notes |
| ---- | ----------------- | ----- |
| HTTP version lookup without spawning `npm` | [`latest-version`](https://www.npmjs.com/package/latest-version), [`package-json`](https://www.npmjs.com/package/package-json) | Both use `npm-registry-fetch` under the hood, honor `~/.npmrc`, return parsed JSON. ~50 LoC equivalent. |
| HTTP fetch that respects npm config (auth, registry, scope, proxy) | [`npm-registry-fetch`](https://www.npmjs.com/package/npm-registry-fetch) | Maintained by the npm team. Drop-in for `fetch` against any npm-style registry. |
| Retry with exponential backoff | [`p-retry`](https://www.npmjs.com/package/p-retry), [`async-retry`](https://www.npmjs.com/package/async-retry) | Either is ~1 KB. Hive-mind#1725 inlined ~30 LoC equivalent rather than depending on a library; that's a reasonable choice for `use-m` too if we want to stay dependency-free. |
| In-memory + file cache with TTL | [`cacache`](https://www.npmjs.com/package/cacache), [`flat-cache`](https://www.npmjs.com/package/flat-cache) | `cacache` is what npm itself uses. Probably overkill; PR #40's hand-rolled `os.tmpdir()/use-m-cache` is fine. |
| Alternative npm registry mirror | `https://registry.npmjs.cf` (Cloudflare-fronted, CORS-enabled) | Works as drop-in registry for read-only operations. Unofficial, no SLA. Worth surfacing as a `--registry` option but not as a default. |

Online sources consulted (web search summaries; URLs in commit history of this directory):

* npm CLI issues tracker — multiple reports of transient `403 Forbidden` from registry on shared CI IPs, dating back to 2022. No fix on the npm side; the consensus workaround is application-level retry.
* GitHub Actions `runner-images` issues — sporadic reports of `npmjs.org` 403s after long-running steps; closed as upstream/registry behaviour.
* Cloudflare community — confirmation that `403` (not `429`) is the canonical response for rate-limit / WAF blocks at the edge.

These sources support RC-B's framing: *the registry will sometimes 403 us through no fault of our own; clients must be resilient.*

---

## 8. Issues to file in other repos (R6) — proposed text

We'll file **after** the maintainer picks A/B/C, so the linked fix is real. Drafts kept here for review:

### 8.1 `npm/cli` (informational, no expectation of fix)

Already covered by existing reports; we'll add a comment to the most relevant open issue with our specific reproduction (calculator run 22410298646) rather than open a new one.

### 8.2 `actions/runner-images`

Same — there are open issues; we'll add our run as a data point only if the maintainer wants. Default plan: skip, because the fix lives in `use-m`, not the runner image.

### 8.3 Templates `link-foundation/js-ai-driven-development-pipeline-template` and `…/rust-…`

Per the hive-mind case study, neither template currently uses `await use('<pkg>@latest')` at module top level, so they don't trigger the bug today. We will **not** open issues there now (would be noise). When/if either template adopts the pattern, the docs from this case study should be back-ported.

### 8.4 `link-foundation/use-m` — internal follow-ups

* Bump the existing PR #40 (file-based cache) and PR #36 (in-memory cache) into the chosen design (only if option B or C is selected).
* New issue: *"Add `USE_M_DEBUG` verbose mode"* — this is part of S5 and R5; we can either land it in this same PR or split it out, maintainer's call.

---

## 9. Status / next step

* R1 ✅ — three-layer root cause documented (§5).
* R2 ✅ — five candidate solutions documented with trade-offs (§6).
* R3 ✅ — logs and sources committed under this directory.
* R4 ✅ — timeline + this document.
* R5 ⏳ — S5 (verbose mode) is recommended to ship in this PR regardless of A/B/C selection. Awaiting maintainer go-ahead before adding code.
* R6 ⏳ — drafts above; will file after A/B/C decision.
* R7 ✅ — §7.

**Awaiting maintainer decision on §6 (option A, B, or C).** Once chosen, a follow-up commit to PR #53 will implement it.
