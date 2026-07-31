#!/usr/bin/env node
// A project whose modules each open with `await use(...)`. Nothing here is
// aware of the others, yet all three requests for lodash overlap, because
// Node.js evaluates sibling top-level-await subgraphs concurrently.
//
//   node examples/concurrent-imports/main.mjs
//
// Run it against an empty npm prefix to see the cold-start wave:
//
//   npm_config_prefix=$(mktemp -d) node examples/concurrent-imports/main.mjs
//
// Before use-m 8.15.0 that wave raced inside the npm global root and could
// leave a half-extracted package behind (issue #70). It is now one install,
// shared by every caller in the process and guarded against other processes.
import { unique } from './lodash-helpers.mjs';
import { titles } from './lodash-formatting.mjs';
import { sorted } from './lodash-sorting.mjs';

const words = ['pear', 'apple', 'pear', 'fig'];

console.log('unique:', unique(words));
console.log('sorted:', sorted(unique(words)));
console.log('titles:', titles(sorted(unique(words))));
