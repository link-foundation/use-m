# Issue 56 CI/CD and npm Release Case Study

Issue: https://github.com/link-foundation/use-m/issues/56  
Pull request: https://github.com/link-foundation/use-m/pull/57  
Investigation date: 2026-06-12

## Summary

The npm package was already configured for trusted publishing on npmjs.com, but the repository still published from `.github/workflows/deploy.yml` with `secrets.NPM_TOKEN`. The npm trusted publisher screenshot attached to the issue shows the trusted workflow filename as `release.yml`, so the active workflow could not use the configured trusted publisher path.

The failed publish run also showed package metadata corrections and a token-based publish failure. This PR moves CI and publishing into one `.github/workflows/release.yml`, uses npm OIDC trusted publishing, updates action versions, removes noisy artifact uploads, normalizes npm metadata, and adds a workflow policy test so these release invariants are checked locally and in CI.

## Evidence Stored Here

- `assets/issue-56-screenshot.png`: npm package settings evidence from the issue. It shows package version `8.13.7`, license `UNLICENSED`, and trusted publisher workflow `release.yml`.
- `ci-logs/run-27414850492.json`: GitHub Actions run metadata for failed main run `27414850492`.
- `ci-logs/run-27414850492.log`: full failed CI log.
- `ci-logs/local-repro-before.log`: local regression test output before the workflow fix.
- `ci-logs/local-repro-after.log`: local regression test output after the workflow fix.
- `ci-logs/npm-publish-dry-run.log`: local npm publish dry-run after metadata normalization.
- `ci-logs/npm-test.log`: full Jest test run after the fix.
- `ci-logs/bun-test.log`: full Bun test run after the fix.
- `ci-logs/deno-test.log`: full Deno test run after the fix.
- `template-comparison/*.txt`: file trees for the JS, Rust, Python, and C# template repositories referenced by the issue.

## Timeline

- 2026-06-12 12:11:45 UTC: CI/CD run `27414850492` started on `main` at commit `fb3e343f87e271078a59629046d98de29a06b3d0`.
- 2026-06-12 12:11:54 UTC: the workflow found `use-m@8.13.8` missing on npm and decided to run tests and publish (`ci-logs/run-27414850492.log`, line 155).
- 2026-06-12 12:12:30 to 12:13:12 UTC: Node, Bun, and Deno test jobs completed successfully across Ubuntu and macOS (`ci-logs/run-27414850492.json`).
- 2026-06-12 12:13:38 UTC: npm publish ran with `NODE_AUTH_TOKEN` from `secrets.NPM_TOKEN` (`ci-logs/run-27414850492.log`, lines 3488 to 3493).
- 2026-06-12 12:13:38 UTC: npm warned that it had to correct `bin[use]` and normalize `repository.url` (`ci-logs/run-27414850492.log`, lines 3494 to 3497).
- 2026-06-12 12:13:38 UTC: npm publish failed with `E404` on `PUT https://registry.npmjs.org/use-m` (`ci-logs/run-27414850492.log`, lines 3522 to 3529).
- 2026-06-12: the new regression test reproduced the pre-fix failures: repository URL mismatch, missing `release.yml`, and split workflows (`ci-logs/local-repro-before.log`, lines 15 to 98).
- 2026-06-12: after the fix, the regression test passed all five release policy checks (`ci-logs/local-repro-after.log`, lines 7 to 19).
- 2026-06-12: `npm publish --dry-run --access public` completed without the earlier npm metadata correction warnings (`ci-logs/npm-publish-dry-run.log`, lines 1 to 26).

## Requirements From The Issue

- Use npm trusted publishing because it is already configured for this package.
- Fix the npm package license display from `UNLICENSED`/`Unlicensed` to `Unlicense`.
- Check and improve all CI/CD false positives and errors.
- Organize CI/CD into a single `.github/workflows/release.yml`.
- Compare the workflow approach with the JS, Rust, Python, and C# pipeline templates.
- Store logs, screenshots, and analysis under `docs/case-studies/issue-56`.
- Add automated verification so the bug can be reproduced and prevented from returning.

## Root Causes

1. The npm trusted publisher was configured for `release.yml`, but this repository published from `deploy.yml`.

   npm trusted publishing binds to a specific workflow filename. The issue screenshot shows `release.yml`; the old repository state had only `deploy.yml` and `test.yml`. That means the configured trusted publisher path and the actual publish path were different.

2. The publish job used token authentication instead of OIDC trusted publishing.

   The failed log shows `NODE_AUTH_TOKEN: ***` in the publish environment and `npm publish --access public` as the publish command (`ci-logs/run-27414850492.log`, lines 3488 to 3493). The new workflow grants `id-token: write` to the publish job and removes `NODE_AUTH_TOKEN` and `NPM_TOKEN`.

3. Tests were conditionally skipped when the package version already existed on npm.

   The old `deploy.yml` made the test workflow depend on `check-version` and only ran tests when `should-publish == 'true'`. That creates a false positive path where main can show a successful workflow without running the actual test matrix. The new workflow always runs tests for pull requests and main pushes; only the npm publish step is skipped for an already published version.

4. npm package metadata was valid enough to pack but not normalized for publish.

   npm corrected `bin[use]` and normalized `repository.url` in the failed run (`ci-logs/run-27414850492.log`, lines 3494 to 3497). This PR changes `bin.use` from `./cli.mjs` to `cli.mjs` and `repository.url` to `git+https://github.com/link-foundation/use-m.git`.

5. CI emitted avoidable warnings.

   The old workflows used action versions that triggered GitHub's Node.js 20 actions deprecation warnings (`ci-logs/run-27414850492.log`, lines 175, 459, 1651, and 3548). They also uploaded `test-results/` and `coverage/` even though those paths were not produced, causing "No files were found" warnings (`ci-logs/run-27414850492.log`, lines 438, 1078, 1630, and later repeated matrix entries).

## Template Comparison

The referenced templates consistently favor one primary release workflow with explicit permissions, current action versions, timeouts, and release-specific verification.

- JS template: has a central `.github/workflows/release.yml`, uses `actions/checkout@v6`, `actions/setup-node@v6`, Node 24 for release tasks, explicit `timeout-minutes`, `id-token: write`, and npm trusted publishing support.
- Rust template: reinforces release verification and explicit CI gates before publication. The language-specific release target differs, but the release flow still separates testing from publishing and uses explicit job permissions.
- Python template: mirrors the trusted-publisher pattern for package registry release flows, with build/test gates and artifact validation before publication.
- C# template: includes workflow policy tests for release invariants such as explicit timeouts and safe concurrency behavior. The new `tests/release-workflow-policy.test.mjs` follows that pattern for this repository.

The selected implementation keeps this repository's existing Node/Bun/Deno matrix and package scripts, but adopts the template release structure and safety checks.

## Online Documentation Checked

- npm trusted publishing docs: https://docs.npmjs.com/trusted-publishers/
  - Trusted publishing uses OIDC instead of long-lived npm tokens.
  - GitHub trusted publisher configuration includes the workflow filename under `.github/workflows/`.
  - npm trusted publishing requires npm CLI 11.5.1 or newer and Node 22.14.0 or newer.
  - npm recommends trusted publishing over long-lived tokens.
- GitHub Actions OIDC docs: https://docs.github.com/en/actions/how-tos/secure-your-work/security-harden-deployments/oidc-in-cloud-providers
  - The workflow or job must grant `id-token: write` so GitHub can issue an OIDC JWT.
  - `id-token: write` lets the job request an OIDC token; it does not grant repository write access by itself.
- npm package metadata docs: https://docs.npmjs.com/cli/v11/configuring-npm/package-json/
  - npm expects SPDX license identifiers for packages that are intended to be licensed.
  - `UNLICENSED` means the author does not grant rights for a private or unpublished package. That is different from the SPDX `Unlicense` identifier used by this package.

## Solution

1. Replace `deploy.yml` and `test.yml` with `.github/workflows/release.yml`.
2. Always run the Node/Bun/Deno test matrix on pull requests and main pushes.
3. Gate publishing on `main` push plus a successful test matrix.
4. Use `actions/checkout@v6`, `actions/setup-node@v6`, and `denoland/setup-deno@v2`.
5. Use Node 20 for compatibility testing and Node 24 in the publish job, then install npm `^11.5.1` before trusted publishing.
6. Grant publish job permissions `contents: write` and `id-token: write`.
7. Publish with `npm publish --access public --provenance` and no npm token secret.
8. Verify the package version after publishing.
9. Create the git tag and GitHub release idempotently so a rerun can recover if npm publish succeeded but tagging or release creation did not.
10. Normalize `package.json` metadata so npm publish no longer applies automatic corrections.
11. Add `tests/release-workflow-policy.test.mjs` to enforce the release workflow shape, OIDC publishing, current action versions, explicit timeouts, and npm metadata.

## Verification

Local checks captured in this directory:

- Before fix: `npm test -- tests/release-workflow-policy.test.mjs --runInBand` failed with missing `release.yml`, split workflow files, and repository URL mismatch (`ci-logs/local-repro-before.log`, lines 15 to 98).
- After fix: the same command passed (`ci-logs/local-repro-after.log`, lines 7 to 19).
- npm dry-run after metadata normalization: `npm publish --dry-run --access public` succeeded without the previous npm metadata correction warnings (`ci-logs/npm-publish-dry-run.log`, lines 1 to 26).
- Full Node/Jest suite: `npm test -- --runInBand` passed 38 suites and 256 tests (`ci-logs/npm-test.log`, lines 79 to 83).
- Full Bun suite: `bun test` passed 256 tests (`ci-logs/bun-test.log`, lines 359 to 362).
- Full Deno suite: `deno test --allow-net --allow-env --allow-run --allow-read --allow-write --allow-sys` passed 24 test modules with 127 steps (`ci-logs/deno-test.log`, line 349).

`npm run test:examples` was probed as an extra local check but is not included in the release workflow. That harness executes published `use-m@latest` examples and expects `zx` through its script shebang, so it is not a reliable release gate for this branch's unpublished changes.

The remaining verification should come from the updated pull request CI run. The publish job will not execute from the PR branch because it is explicitly gated to `github.ref == 'refs/heads/main'` and `github.event_name == 'push'`.
