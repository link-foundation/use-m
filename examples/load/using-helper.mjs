#!/usr/bin/env node
//
// Using the packaged robust loader: `use-m/load`.
//
// When use-m is installed (`npm i use-m`), you can skip the hand-rolled bootstrap
// and use the resilient loader that ships with the package. It validates every
// CDN response before eval(), retries each mirror, falls back across mirrors, and
// throws a clear, actionable error instead of a cryptic SyntaxError.
// See https://github.com/link-foundation/use-m/issues/58
//
//   import { loadUseM } from 'use-m/load';        // ES Modules
//   const { loadUseM } = require('use-m/load');   // CommonJS
//
// Run from the repository root with: node examples/load/using-helper.mjs

import { loadUseM } from 'use-m/load';

const { use } = await loadUseM();
const _ = await use('lodash@4.17.21');
console.log(`_.add(1, 2) = ${_.add(1, 2)}`);
