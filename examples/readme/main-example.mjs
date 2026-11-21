// Node, Bun, Deno
// import { use } from 'use-m'; // ES Modules
// const { use } = require('use-m'); // CommonJS Modules

// Browser
// const { use } = await import('https://esm.sh/use-m');

// The standalone bundle can be bootstrapped in Node, Bun, Deno, and browsers.
const response = await fetch('https://unpkg.com/use-m/use.js');
if (!response.ok) throw new Error(`Failed to load use-m: HTTP ${response.status}`);
const { use } = eval(await response.text());

// Load a server built-in, a file relative to this script, and an exact npm release.
const os = await use('node:os');
const packageJson = await use('../../package.json');
const lodash = await use('lodash@4.17.21');

console.log(`${packageJson.name} on ${os.platform()}: lodash.add(1, 2) = ${lodash.add(1, 2)}`);
