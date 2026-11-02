# Issue #79 work plan

Objective: implement and verify all issue #79 requirements in PR #82 without
changing behavior that already worked (maintainer feedback on PR #82).

- [x] Read the issue, comments (none at start), PR conversation and reviews.
- [x] Trace version resolution, alias reuse, option forwarding and bundle generation.
- [x] Add ESM/CommonJS regressions for the engine policy.
- [x] Select the newest Node-compatible release for `latest` and ranges.
- [x] Debug line on fallback; `engineStrict` option and `USE_M_ENGINE_STRICT` env var.
- [x] Fail fast with a clear message under `engineStrict: true`.
- [x] Backward compatibility review: keep the `/latest` path, aliases, caches and
      the Deno CDN order; restore unchanged tests from `main` and keep them passing.
- [x] Make the repository's Deno tests independent of mutable esm.sh builds.
- [x] Document behavior in README, CHANGELOG and CONTRIBUTING; release 8.17.0.
- [ ] Push, verify CI for the latest commit, update the PR description, mark ready.
