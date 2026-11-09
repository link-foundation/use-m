# Module shapes changed in a patch release (#83)

use-m 8.16.3 changed what `use()` returns for common packages, and 8.17.0
kept the change. Callers that worked on 8.16.2 broke:

- `const { default: yargs } = await use('yargs@17.7.2')` failed with
  `yargs is not a function`.
- `const simpleGit = await use('simple-git@3.28.0'); simpleGit()` failed with
  `simpleGit is not a function`.
- `await use('ink@5.2.1/build/index.js')` threw `Package subpath
  './build/index.js' is not exported`.

## Reproduce

```sh
node experiments/issue-83/shape-bisect.mjs 8.16.2   # published loader from unpkg
node experiments/issue-83/shape-bisect.mjs 8.17.0
node experiments/issue-83/shape-bisect.mjs local    # this checkout's use.js
node tests/fixtures/module-shape/probe.mjs mjs      # every access pattern, as JSON
```

## Root cause

The #47 change resolved every npm and Bun import through the package's
`exports` map, including the package root `'.'`. Before that, the root went
through `require.resolve(<package dir>)`, which uses `main`. For dual packages
the two disagree:

| Package | `main` (8.16.2) | `exports["."]` for `import` (8.16.3+) |
| --- | --- | --- |
| yargs@17.7.2 | `index.cjs`, a function with the singleton's methods, including `default()` | `index.mjs`, a bare function |
| simple-git@3.28.0 | `dist/cjs/index.js`, a callable function | `dist/esm/index.js`, a namespace with named exports |

The same change also rejected physical files that `exports` does not list.
use-m 8.16.2 loaded those.

## Fix

- The package root resolves through `main` first again, and through
  `exports["."]` only when that fails (packages without `main`). Subpaths keep
  using `exports` first, so `yargs/helpers` and `fs-extra/esm` still resolve.
- An unexported or `null`-blocked subpath loads its physical file when it
  exists and emits one `USE_M_UNEXPORTED_SUBPATH` warning per subpath. It
  throws only when the file is missing.
- When `use()` unwraps a default-only namespace, the value gets a
  non-enumerable `default` self-reference. Both
  `const yargs = await use(...)` and `const { default: yargs } = await use(...)`
  then work, including on yargs@18, which is ESM-only.

## Shapes on Node.js

| Specifier | 8.16.2 | 8.17.0 | This fix |
| --- | --- | --- | --- |
| yargs@17.7.2 | function, `.default` = yargs' `default()` | function, no `.default` | same as 8.16.2 |
| yargs@18.0.0 | function, no `.default` | function, no `.default` | function, `.default` = itself |
| simple-git@3.28.0 | callable function | namespace | same as 8.16.2 |
| fs-extra, semver, @octokit/rest, ink | namespace | namespace | namespace |
| ink@5.2.1/build/index.js | namespace | throws | namespace + one warning |
| fs-extra@11.3.0/esm | throws | namespace | namespace |

On Bun, every specifier returns the same shape as on 8.16.2. Bun exposes every
CommonJS property as a named export, so yargs@17 and simple-git@3 come back as
a namespace there, and the `{ default }` form is the one that works on every
runtime. A full Bun probe run once failed to import ink during a cold install,
but did not fail again in later full or isolated runs.

The contract is locked by `tests/module-shape-contract.test.mjs`, which runs
the probe in a fresh process against `src/use.mjs`, `src/use.cjs`,
`src/use.js` and the root `use.js`. The probe output for the code before the
fix shows the broken patterns: yargs `destructuredDefault`, simple-git
`direct`, simple-git@4 `destructuredDefault`, and the ink subpath.
