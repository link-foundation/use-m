# Issue 64 CI/CD False Positive Case Study

## Summary

Issue 64 reported that the CI/CD workflow could finish green even when the publish path did not publish anything. The linked main-branch run `27917555327` tested successfully, then reached the publish job with `use-m@8.14.1`, found that version already existed on npm, skipped npm publishing, and still completed tag and GitHub release steps for `v8.14.1`.

The fix makes that all-existing release state fail loudly. If the npm version, git tag, and GitHub release all already exist, the workflow now emits a GitHub Actions error and exits non-zero with instructions to bump `package.json` before merging to `main`. If the npm package exists but tag or release metadata is missing, the workflow still allows the self-healing metadata repair path.

## Evidence Stored Here

- `github-data/issue-64.json`: issue title, body, labels, and state.
- `github-data/issue-64-comments.json`: issue comments, empty at investigation time.
- `github-data/pr-65.json`: prepared PR metadata.
- `ci-logs/run-27917555327.json`: linked main-branch CI run metadata.
- `ci-logs/run-27917555327.log`: linked main-branch CI run logs.
- `ci-logs/pr-branch-runs.json`: recent prepared-branch CI runs.
- `ci-logs/pr-run-27917899493.json`: prepared PR run metadata.
- `ci-logs/pr-run-27917899493.log`: prepared PR run logs before the fix.
- `ci-logs/npm-current-version-before.txt`: npm registry state for the package before the fix.
- `ci-logs/npm-8.14.2-before.txt`: proof that `use-m@8.14.2` was not published before the version bump.
- `ci-logs/local-repro-before.log`: failing regression test before the workflow fix.
- `ci-logs/local-repro-after.log`: passing focused regression test after the workflow fix.
- `ci-logs/npm-test.log`, `bun-test.log`, `deno-test.log`: final local test runs.
- `ci-logs/npm-audit-prod.log`: production dependency audit result.
- `ci-logs/npm-audit-all.log`, `npm-audit-fix.log`, `npm-audit-all-after-fix.log`: dev audit investigation and safe lockfile update results.
- `ci-logs/npm-publish-dry-run.log`: local npm publish dry-run for `use-m@8.14.2`.
- `template-comparison/*`: release workflow and helper snapshots from the JS, Rust, Python, and C# templates.

## Timeline

- `2026-06-21T21:09:27Z`: linked `main` run `27917555327` started at commit `c7df84f`.
- `2026-06-21T21:10:53Z`: publish job read package metadata for `use-m@8.14.1`.
- `2026-06-21T21:10:54Z`: npm registry check found `use-m@8.14.1` already published and skipped npm publishing.
- `2026-06-21T21:10:55Z`: the same job found tag `v8.14.1` and GitHub release `v8.14.1` already existed, then still completed successfully.
- `2026-06-21T21:23:20Z`: prepared PR branch run `27917899493` started at commit `c42678b` and reproduced the same successful no-op release behavior.
- Local reproduction then added a release workflow policy test that failed against the old skip behavior and passed after the guard was implemented.
- npm registry checks showed `8.14.1` was the current published version and `8.14.2` was unpublished, so the package version was bumped to `8.14.2`.

## Root Causes

1. The publish job treated an already-published npm version as a success even when the matching git tag and GitHub release also already existed.
2. The skip path only skipped npm publishing. It did not fail the release run, so a main-branch merge could produce a green CI/CD run without any new package artifact.
3. No regression test covered the "npm package, tag, and GitHub release all already exist" no-op state.
4. `npm ci` printed dev audit warnings in every install log, even though production dependencies audited cleanly. This created noisy CI output that looked like a release concern.
5. Browser tests printed the expected Skypack uppercase `URL` CORS rejection as `Browser console error`, adding unrelated error-looking log lines.

## Template Comparison

The JavaScript template already has a stricter release shape:

- It uses a pre-publish check helper that reports whether a release should happen.
- It supports a self-healing `skip_bump` state when npm already has the version but repository metadata needs repair.
- Release notes and GitHub release updates are gated on successful publish output.
- npm publishing is kept in one trusted-publisher workflow.

The Rust, Python, and C# templates were also reviewed. They have ecosystem-specific release gates and smoke checks, but they did not show the same "already published but green no-op release" pattern as this repository. No external template issues were opened because the directly matching defect was local to this workflow.

## Online Documentation Checked

- npm trusted publishing: https://docs.npmjs.com/trusted-publishers/
- GitHub Actions workflow commands, including `::error::`: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-commands
- GitHub OIDC hardening and `id-token: write`: https://docs.github.com/actions/security-for-github-actions/security-hardening-your-deployments/about-security-hardening-with-openid-connect

## Options Considered

1. Keep the existing no-op skip behavior. Rejected because it preserves the false positive described in the issue.
2. Adopt the full JavaScript template release helper. Deferred because this package can close the false-positive path with a smaller workflow change and an explicit regression test.
3. Fail only when the npm version exists. Rejected because it would remove the existing self-healing path for incomplete tag or release metadata.
4. Fail when npm version, git tag, and GitHub release all exist. Selected because it blocks the false positive while preserving metadata repair.
5. Run `npm audit fix --force`. Rejected because npm would install `babel-jest@25.0.0`, a breaking downgrade. Safe non-breaking lockfile updates were kept, and production audit is clean.

## Implemented Solution

- Added a publish guard that checks npm, git tag, and GitHub release state together.
- Emit a GitHub Actions error and `exit 1` when all three release artifacts already exist.
- Preserve the metadata repair path when npm has the version but tag or release metadata is missing.
- Bumped package metadata and lockfiles from `8.14.1` to unpublished version `8.14.2`.
- Added regression coverage to `tests/release-workflow-policy.test.mjs`.
- Changed workflow installs to `npm ci --no-audit --no-fund` and added a focused production audit step on the Node/Ubuntu test job.
- Filtered the known Skypack uppercase `URL` browser CORS error from browser test console noise.
- Applied non-breaking npm audit lockfile updates and kept the remaining dev-only Jest `js-yaml` audit finding documented.

## Verification

Final verification commands were run with logs saved in `ci-logs/`:

- `npm test -- tests/release-workflow-policy.test.mjs --runInBand`: 1 suite, 8 tests passed.
- `npm test -- --runInBand`: 45 suites, 333 tests passed.
- `bun test`: 333 tests passed, 0 failed.
- `deno test --allow-net --allow-env --allow-run --allow-read --allow-write --allow-sys`: 32 tests, 175 steps passed.
- `npm audit --omit=dev`: 0 vulnerabilities.
- `npm publish --dry-run --access public`: packed `use-m@8.14.2` successfully.

The initial parallel local run showed two environment artifacts: Bun reported port `8002` in use, and the npm TypeScript test exceeded the default 5 second test timeout. Rerunning the suites sequentially passed, matching the isolation model used by CI jobs.

## Residual Risk

`npm audit` without `--omit=dev` still reports moderate `js-yaml` findings through Jest's `@istanbuljs/load-nyc-config` path. npm only offers a force fix that installs `babel-jest@25.0.0`, which is a breaking downgrade from the current test stack. Production dependencies audit cleanly, and the workflow now audits shipped dependencies explicitly.
