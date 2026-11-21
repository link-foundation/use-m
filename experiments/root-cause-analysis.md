# Root Cause Analysis for Issue #47

## Problem

`use('yargs/helpers')` failed even though yargs publicly exports that subpath.

## Root cause

The npm and Bun resolvers appended the requested subpath to the installed
package directory and tried to resolve that physical path directly. Package
subpaths are logical names, however, and must first be matched against the
installed package's root `package.json` `exports` map.

For yargs, the relevant mapping is equivalent to:

```json
{
  "exports": {
    ".": "./index.mjs",
    "./helpers": "./helpers/helpers.mjs"
  }
}
```

The old resolver treated `yargs/helpers` as an on-disk directory. It could only
work accidentally when a package happened to have a compatible physical layout,
and it failed when the public name mapped somewhere else. Resolving physical
paths first also let callers load private files that an `exports` map did not
expose.

## Required behavior

For an installed package with an `exports` field, the local resolvers must:

1. Read `package.json` from the package root.
2. Convert the requested path to an export key (`.` or `./subpath`).
3. Match exact keys before wildcard patterns.
4. Select nested `node`/`import` conditions and supported array fallbacks.
5. Substitute wildcard captures into the selected target.
6. Require a relative target that remains inside the package root.
7. Reject missing, `null`, or otherwise unexported subpaths instead of falling
   through to a physical private file.
8. Preserve legacy physical resolution only for packages without `exports`.

## Verification

The deterministic npm and fake-Bun tests cover exact mappings whose requested
directory does not exist, wildcard and nested conditional mappings, array
fallbacks, and package encapsulation. The real-package integration test covers
latest and pinned yargs versions and verifies that `hideBin` works.
