# Root Cause Analysis for Issue #47

## Problem
Cannot import sub-paths like 'yargs/helpers' - use-m fails to resolve the path.

## Error Message
```
Error: Failed to resolve the path to 'yargs/helpers' from '/home/hive/.nvm/versions/node/v20.19.5/lib/node_modules/yargs-v-latest/helpers'.
```

## Root Cause

### What Should Happen
When importing `yargs/helpers`:
1. Parse the module specifier into: packageName='yargs', version='latest', modulePath='/helpers'
2. Install package as `yargs-v-latest`
3. Read `yargs-v-latest/package.json`
4. Look up `./helpers` in the `exports` field
5. Resolve to the mapped file: `./helpers/helpers.mjs`
6. Import from `/node_modules/yargs-v-latest/helpers/helpers.mjs`

### What Actually Happens
1. ✓ Parse correctly: packageName='yargs', version='latest', modulePath='/helpers'
2. ✓ Install package as `yargs-v-latest`
3. ✓ Construct path: `packageModulePath = /node_modules/yargs-v-latest/helpers`
4. ✗ **BUG**: `tryResolveModule` tries to resolve the directory `/helpers` directly
5. ✗ When that fails, it reads package.json but only checks for the root "." export
6. ✗ It never checks if there's a sub-path export for "./helpers"
7. ✗ Returns null, causing the error

### Code Location
File: `use.mjs`, lines 476-522 (npm resolver) and lines 606-650 (bun resolver)

The `tryResolveModule` function:
- Only handles the root export (`exp['.']`)
- Does NOT handle sub-path exports like `exp['./helpers']`

### The Fix Needed
In the `tryResolveModule` function, when we have a modulePath (like '/helpers'):
1. Check if the exports field has a matching sub-path entry
2. If found, resolve to the mapped file
3. Otherwise, fall back to current behavior

### Example from yargs/package.json
```json
{
  "exports": {
    "./package.json": "./package.json",
    "./helpers": "./helpers/helpers.mjs",  // ← This needs to be checked!
    "./browser": {
      "types": "./browser.d.ts",
      "import": "./browser.mjs"
    },
    ".": "./index.mjs",
    "./yargs": "./index.mjs"
  }
}
```

When importing `yargs/helpers`:
- Current code: Only checks `exports["."]` → doesn't find "./helpers"
- Fixed code: Should check `exports["./helpers"]` → finds "./helpers/helpers.mjs"
