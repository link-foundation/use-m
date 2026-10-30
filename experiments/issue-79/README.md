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
