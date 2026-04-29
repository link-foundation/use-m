# Web research notes — issue #52

Notes captured during the investigation. Cited from the body of `README.md` §5, §7. Kept here for traceability so that, if the proposed solution is later challenged, we can re-derive the reasoning without re-searching.

## Q1 — Is `403 Forbidden` from `https://registry.npmjs.org/<pkg>` a known transient condition for unauthenticated reads?

**Findings (synthesised from public npm/cli issue tracker and GitHub Actions community threads):**

- The npm registry is fronted by Cloudflare. Cloudflare's WAF / abuse-mitigation responses for over-rate or pattern-matched requests are typically **`403`**, not `429`. This is consistent with the verbatim error string we captured (`npm error 403 403 Forbidden — GET https://registry.npmjs.org/command-stream`).
- GitHub-hosted runners share egress IP ranges across many concurrent jobs across many tenants. A spike of `npm` traffic from a shared range can trip per-IP/per-AS limits that have nothing to do with our package, our token, or our config.
- The `npm` CLI does **not** retry on transient 4xx — it surfaces the upstream HTTP status. Combined with `use-m`'s no-retry behaviour (RC-B), one transient 403 is enough to fail a job.

**Conclusion that informs §6:** application-level retry (S3) is the correct mitigation; we should not expect npm or Cloudflare to change.

## Q2 — Does `actions/setup-node@v4` write an auth token to `.npmrc` that could cause 403 against the public registry?

**Findings (from `actions/setup-node`'s `auth.ts` source):**

- `.npmrc` modification only happens when `registry-url` input is set or `always-auth: true`. In our run (line 162 of the captured log), `always-auth: false` and no `registry-url`. So **no `.npmrc` is written**.
- Therefore the 403 is not an auth misconfig. It's a transport-level / rate-limit / WAF response from the registry. Confirms RC-B framing.

## Q3 — Are there existing libraries that resolve `latest` versions without shelling out to `npm`?

| Library | Mechanism | Suits use-m? |
| ------- | --------- | ------------ |
| `latest-version` | wraps `package-json` | yes — drop-in for `getLatestVersion` |
| `package-json` | wraps `npm-registry-fetch` | yes — slightly lower-level |
| `npm-registry-fetch` | fetch wrapper that honours `~/.npmrc` | yes — if we want full npm-config parity |

Cloudflare-fronted public mirror at `https://registry.npmjs.cf` exists with CORS enabled. Useful as a `--registry` opt-in, **not** as a default (no SLA, unofficial).

## Q4 — Are there existing libraries for retry with exponential backoff?

`p-retry`, `async-retry`, `retry`. Each is sub-2 KB. Hive-mind#1725 chose to inline ~30 LoC instead of taking a dependency, which is a reasonable choice for `use-m` to mirror (use-m is intentionally low-dependency).

## Q5 — Has anyone previously asked for caching of `@latest` in `use-m`?

Yes — open in-tree:

- Issue #17 — "Support caching for non specific versions" (open).
- PR #40 — "Add caching support for non-specific package versions" (open, +868 lines, file-based cache, default 5-min TTL).
- PR #36 — "Implement in-memory cache for modules" (open, +270 lines).

**Implication:** option B/C from §6 can build on existing prototype work rather than starting from scratch.

## Q6 — Does anyone else in the link-foundation org run into the same bug?

- `link-assistant/calculator` issue #76 / PR #77 — fixed downstream by pinning versions (S1 strategy). Merged.
- `link-assistant/hive-mind` issue #1724 / PR #1725 — fixed downstream by pre-installing `@latest` packages with retries before tests run, exploiting `use-m`'s existing `installedVersion === latestVersion` early-return. Merged. This is essentially a downstream implementation of S2+S3 against `use-m`'s public API, without modifying `use-m`.

Both downstream fixes prove the architectural diagnosis in §5: the bug is in `use-m`'s lack of retry/cache, and once you avoid the unprotected code path, the symptom disappears.
