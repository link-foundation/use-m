# Node-compatible npm resolution (#79)

Before this change, the npm resolver fetched only the `/latest` version string
and passed ranges straight to npm. It never looked at `engines.node`. npm only
warns on engine mismatches, so an unpinned script could install a new major that
no longer supports the running Node.js and then fail later (for example in a
native build).

## Reproduce

```sh
node experiments/issue-79/reproduce.mjs
npm test -- --runInBand tests/npm-engines.test.mjs tests/npm-engines.test.cjs
```

The standalone experiment uses a temporary fake npm, a fake registry with
`command-stream@1.6.2` (`>=20`) and `2.0.0` (`>=22`, the `latest` dist-tag),
and a simulated `process.versions.node` of `20.20.2`. It makes no network
requests and no real global installs. It checks that only `1.6.2` is installed
and prints the debug line explaining the fallback. Cleanup restores the
runtime version and removes the fixture, even when an assertion fails.

## Backward compatibility contract

The maintainer asked
([PR #82 comment](https://github.com/link-foundation/use-m/pull/82)) that the PR
only fix things and that everything that worked before keeps working, because
users download the bundles directly. The design follows from that:

| Situation | Before | After |
| --- | --- | --- |
| `latest` supports the running Node | `/latest` fetch, `pkg-v-latest` alias | identical: same request, cache key, `npm show` fallback and alias |
| `latest` requires a newer Node | installs it anyway; fails later | installs the newest compatible release under `pkg-v-<exact>` and logs a debug line |
| Range (`^1`, `~2.3`, `1.x`, …) | `pkg-v-<range>` alias, npm picks | same alias; npm's pick is replaced only when it would not support this Node |
| Already installed range alias | reused without lookup | reused without lookup |
| Exact version or named tag | installed as requested | unchanged, no extra request |
| No compatible release exists | npm installs it | unchanged by default (debug line only); `engineStrict: true` / `USE_M_ENGINE_STRICT=true` fails before install with `USE_M_UNSUPPORTED_NODE` |
| Opt-out | — | `engineStrict: false` or `USE_M_ENGINE_STRICT=false` / `0` restores the old path exactly |
| Deno resolver order | esm.sh → jspm → skypack | unchanged, plus native `npm:` as a last fallback when every CDN fails |

The test files from `main` that cover the npm resolver, registry resilience,
the global-prefix logic, fallbacks and the pre-change contract are kept
unchanged and still pass. New behavior is covered by new tests only.

## Requirement inventory

| Requirement (issue #79) | Implementation | Verification |
| --- | --- | --- |
| `latest` and ranges resolve to the newest release whose `engines.node` matches | `selectNodeCompatibleVersion` (npm semver, `process.versions.node`); packument fetched only when npm's pick is incompatible | latest/range cases, no move past the dist-tag, the simulated Node 20 → command-stream 2.0.0 incident |
| Print a debug line on fallback | Existing default-off logger: `pkg@latest is X (engines node R) — using Y, the newest release compatible with Node N` | diagnostic and quiet-mode tests |
| Opt-out via option or env var | `engineStrict: false` per call or per `makeUse`; `USE_M_ENGINE_STRICT=false` / `0` | instance, exported `use`, environment and per-call tests |
| At minimum, fail fast with a clear message | `engineStrict: true` / `USE_M_ENGINE_STRICT=true` throws before installation | no-install assertions and message checks |
| Keep resilient loading | `npm view` fallback, stale scoped cache, scan of installed exact versions | CLI fallback, stale cache and offline tests |
| Keep standalone bundles | Build embeds the npm semver functions (with their ISC license) as a non-leaking `const` | deterministic build check; `vm` context test |

Exact pins and named tags other than `latest` stay explicit choices. As in npm,
automatic selection skips prereleases unless the range includes them. A release
with no engines is allowed; a release with an invalid engines range is not.
Checks apply to the requested package, not its dependency tree.

## CI notes

- Version 8.16.4 was already published, so the release version is 8.17.0.
- Undici 6.28.1 failed the production audit; it was updated within 6.x to 6.29.1.
- Deno failed on `deno.lock` integrity for
  `https://esm.sh/typescript@5.9.3/denonext/typescript.mjs`. esm.sh serves
  different builds of that URL over time and per platform (`64861860…` on one
  run, `dc5e8d5f…` on others; see runs
  [41047208222](https://github.com/link-foundation/use-m/actions/runs/41047208222)
  and [41050700146](https://github.com/link-foundation/use-m/actions/runs/41050700146)).
  A hash of CDN-generated output cannot be pinned, so the repository's own
  Deno test configuration no longer uses a lockfile (`"lock": false`). This
  affects only this repository's tests, not the published package.
- Deno command-stream/lodash imports failed when esm.sh returned HTTP 500 and the
  alternate CDNs returned 404 (`inspect-deno-cdn.mjs`). The CDN order is kept;
  Deno's native `npm:` import is added only as the last fallback.
- A browser test waited for network idle and timed out on one slow unrelated
  request (`browser-navigation.mjs`). It now waits for DOM readiness and then for
  the existing completion signal. No timeouts were increased.
