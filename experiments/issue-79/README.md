# Node-compatible npm resolution (#79)

The original npm resolver fetched only `/latest`'s version string and passed
ranges straight to npm. It never examined `engines.node`. npm treats mismatches
as warnings, so an unpinned script could install a newly incompatible major and
fail later during a native build. Completion markers also treated range aliases
as permanently installed, even when their highest matching version changed.

## Reproduce

```sh
node experiments/issue-79/reproduce.mjs
npm test -- --runInBand npm-engines npm-registry-resilience
```

The standalone experiment uses a temporary fake npm, fixtures for
`command-stream@1.6.2` (`>=20`) and `2.0.0` (`>=22`), and a simulated
`process.versions.node` of `20.20.2`. It performs no registry requests or real
global installations. It asserts that only `1.6.2` is installed and prints the
engine-selection diagnostic. Cleanup restores the runtime version and removes
the fixture even if an assertion fails.

Before implementation, the initial ESM/CommonJS regression run had 40 failures
and 2 passes. It showed `latest` selecting `2.0.0`, ranges being handed directly
to npm, and incompatible requests reaching installation. The final regressions
cover selection, pre-install rejection, configuration, and cache/alias behavior.

## Requirement inventory

| Requirement | Implementation | Verification |
| --- | --- | --- |
| Default implicit/explicit latest selects newest Node-compatible release | Packument manifests + npm semver, using `process.versions.node` | latest cases; exact runtime engine test; simulated Node 20 incident |
| Ranges choose highest compatible version within the request | Same selection constrained by the requested semver range | caret, tilde, wildcard, comparator, hyphen, and OR tests; explicit prereleases |
| Explain a fallback with debug logging | Existing default-off logger includes rejected engine, selected release, and runtime | diagnostic and quiet-mode tests |
| Provide an opt-out | `engineStrict:false` per call or instance; `USE_M_ENGINE_STRICT=false` / `0` | instance, exported `use`, environment, and per-call tests |
| Fail fast when no compatible release exists | Actionable error exits metadata selection before installation | no-install assertions; no CLI/stale fallback after incompatibility |
| Preserve resilient loading | Retry/CLI/cache/installed fallback paths retain engine metadata or validate installed manifest | registry resilience suite; stale cache; compatible/incompatible installed alias tests |
| Avoid unsafe reuse after a Node upgrade or range change | Cache identity includes runtime and selector; alias marker must match selected exact version | Node 20-to-22 cache test; range cache isolation and alias refresh |
| Keep distributions standalone | Build embeds pinned npm semver functions with their ISC license | deterministic build, root entry, browser and cross-runtime suites |

Exact pins and named tags other than `latest` stay explicit choices. As with
npm's default semver range behavior, automatic selection excludes prereleases
unless the range includes them. Missing engines permit a release; invalid
engine ranges exclude it. Checks apply to the requested package, not to its
transitive dependency graph. The Bun and CDN resolver defaults remain
runtime-specific. These scope decisions are documented in the README.

The issue and PR had no comments, reviews, or required sub-issues during initial
research. Related issues #73/#78 supply incident context and are separate work.

The local production audit also exposed an existing vulnerable Undici lock.
The PR moves the supported 6.x dependency to 6.29.1 so the required audit passes.
Release version: 8.17.0.

## CI investigation

The initial [run 41047208222](https://github.com/link-foundation/use-m/actions/runs/41047208222)
started at 2026-10-30 11:19:03 UTC on the untouched branch SHA
`b0858907ac8811a3ac04d9484cf3db7df4605e41`. Logs were downloaded to local
`ci-logs/` before making the corresponding repairs:

- `initial-124034110593.log:176`: version 8.16.4 was already published.
  Version 8.17.0 passes the unpublished-version check.
- `initial-124034111006.log:198-209`: Undici 6.28.1 failed the production audit.
  The supported 6.x update to 6.29.1 leaves zero production vulnerabilities.
- `initial-124034110989.log:793-804`: Deno stopped on the TypeScript 5.9.3
  CDN hash mismatch (expected `64861860...`, served `dc5e8d5f...`). The latter
  SHA-256 was independently verified from the current version-labelled artifact.
  A subsequent matrix run proved that both different builds are still served
  from that same URL; the original hash is retained and native npm imports avoid
  the unstable transform.
- Deno also failed command-stream and lodash subpath imports. The retained
  `inspect-deno-cdn.mjs` probe exposed HTTP 500 from esm.sh and HTTP 404 from
  both alternate mirrors for command-stream 0.0.5. Deno's native `npm:` importer
  is now preferred; all original CDNs remain fallbacks in their original order. The repository
  uses Deno-managed global npm caching so dynamic packages can be fetched without
  changing the local npm installation. The lockfile includes these npm versions.
  Deno's explicit `.js` suggestion is honored once for extensionless npm subpaths,
  preserving the existing lodash import regression. The fixture declares its
  CommonJS type so public `use()` imports work on Deno too.

The native-import regressions failed before implementation. Moving native npm
ahead of the mutable CDN builds reproduced 6 failures across the ESM/CommonJS
suites before the resolver-order change. Tests also prove that all CDN fallbacks
remain available if native resolution fails.

### Matrix follow-up

[Run 41050700146](https://github.com/link-foundation/use-m/actions/runs/41050700146)
started at 2026-10-30 11:48:15 UTC on SHA
`2ecf2c733863187420480bf3cd171505bdb0219d`. Its downloaded logs isolated two
remaining failures; all other runtime jobs passed:

- `run-41050700146-deno-ubuntu.log:1328-1332`: the same TypeScript URL served
  SHA-256 `64861860...` on Linux while macOS, Windows, and the local environment
  received `dc5e8d5f...`. Merely swapping the hash cannot make this reliable.
  Native npm imports preserve archive integrity checks and avoid the transform;
  all CDN resolvers remain available.
- `run-41050700146-node24-macos.log:208-218`: browser navigation hit its 30-second
  network-idle deadline before the suite read its explicit completion signal.
  `browser-navigation.mjs` reproduces this with one unrelated pending request,
  using the navigation policy directly from the browser test. It fails before
  the fix with a bounded 3-second navigation timeout and passes afterward.
  Navigation now waits for DOM readiness, then the existing test result signal;
  no test or CI timeout was increased.

Run the browser regression with `node experiments/issue-79/browser-navigation.mjs`
(set `PUPPETEER_EXECUTABLE_PATH` if using an installed Chrome). It always closes
the browser and its finite local server, including after an assertion fails.

Local verification before the matrix follow-up passed all 623 tests on Node 24
and Bun, including the browser suite, and 42 Deno groups / 365 steps. The added
native-first regression brings the final counts to 625 Node/Bun tests and
366 Deno steps (with the existing 1 ignored group / 3 steps unchanged).
The standalone incident reproduction and real npm example pass.
The production audit reports zero vulnerabilities;
the version check, deterministic bundle verification, package dry run, and
missing-fetch shebang experiment pass. Large command outputs remain in local
`ci-logs/` for inspection rather than being added to the package.
