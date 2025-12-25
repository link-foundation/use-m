# Case Study: Issue #50 - Do Not Hardcode Builtins

## Overview

**Issue**: [#50 - do not hardcode builtins](https://github.com/link-foundation/use-m/issues/50)
**Date**: December 2025
**Status**: Implementation in progress

## Problem Statement

The `use-m` library maintains a hardcoded list of Node.js built-in modules in the `supportedBuiltins` object. This approach has several drawbacks:

1. **Maintenance burden**: New Node.js versions introduce new built-in modules that require manual updates
2. **Code size**: The hardcoded list adds to the bundle size that needs to be downloaded
3. **Version drift**: The list may become outdated as Node.js evolves
4. **Incomplete coverage**: Not all built-in modules are included in the hardcoded list

## Timeline of Events

### Initial Report
- User `klntsky` opened issue #50 pointing out that built-in modules can be obtained dynamically using `module.builtinModules`
- Provided code snippet demonstrating how to access the list

### Requirements Clarified
- Maintainer `konard` requested a case study analysis to:
  - Reconstruct the timeline/sequence of events
  - Find root causes of the problem
  - Propose possible solutions

## Root Cause Analysis

### Current Implementation (Before Fix)

The `use.mjs` file (and corresponding `use.cjs`, `use.js`) contains a `supportedBuiltins` object with hardcoded entries:

```javascript
const supportedBuiltins = {
  'console': { browser: ..., node: ... },
  'crypto': { browser: ..., node: ... },
  'fs': { browser: null, node: ... },
  // ... approximately 25 more hardcoded entries
};
```

### Why This Is Problematic

1. **Node.js has ~70+ built-in modules** (as shown in issue description)
2. **Current hardcoded list covers only ~25 modules**
3. **New modules** like `node:sqlite`, `node:test`, `node:sea` are not supported
4. **Subpath modules** like `path/posix`, `path/win32`, `util/types` may be missed

## Solution Analysis

### Node.js API: `module.builtinModules`

Node.js provides a built-in API to dynamically retrieve all available modules:

```javascript
// ESM
import { builtinModules } from 'node:module';

// CommonJS
const { builtinModules } = require('node:module');
```

As of Node.js v23.5.0+, this list includes prefix-only modules.

### Node.js API: `module.isBuiltin()`

Additionally, Node.js v18.6.0+ provides a helper function:

```javascript
import { isBuiltin } from 'node:module';
isBuiltin('node:fs');  // true
isBuiltin('fs');       // true
isBuiltin('wss');      // false
```

## Proposed Solution

### Strategy: Hybrid Approach

Since `use-m` supports both browser and Node.js environments, and some built-in modules require special browser polyfills or wrappers:

1. **Keep special handling** for modules that need browser polyfills (`console`, `crypto`, `url`, `performance`)
2. **Use `isBuiltin()`** to dynamically detect all other Node.js built-in modules
3. **Fall back to generic import** for modules without special browser handling

### Implementation Changes

1. **Add dynamic builtin detection** using `module.isBuiltin()` or checking against `builtinModules`
2. **Reduce hardcoded list** to only modules that need special browser handling
3. **Update all three files**: `use.mjs`, `use.cjs`, `use.js`

### Benefits

- **Smaller code size**: Removes ~200+ lines of hardcoded module definitions
- **Future-proof**: Automatically supports new built-in modules
- **Better coverage**: Supports all 70+ built-in modules immediately
- **Easier maintenance**: No need to update list when Node.js adds new modules

## References

- [Node.js module.builtinModules API](https://nodejs.org/api/module.html)
- [GitHub Issue #50](https://github.com/link-foundation/use-m/issues/50)
- [npm package: builtin-modules](https://github.com/sindresorhus/builtin-modules) - static alternative

## Files Modified

- `use.mjs` - Primary implementation
- `use.cjs` - CommonJS version
- `use.js` - Universal/browser version
- `tests/builtins.test.mjs` - Tests for dynamic builtin detection
- `tests/builtins.test.cjs` - CommonJS version of tests
