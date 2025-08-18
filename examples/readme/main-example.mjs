// Node, Bun, Deno
// import { use } from 'use-m'; // ES Modules
// const { use } = require('use-m'); // CommonJS Modules

// Deno, Browser
// const { use } = await import('https://esm.sh/use-m');

// Node, Bun, Deno, Browser (universal script)
const { use } = eval(
  await (
    await fetch('https://unpkg.com/use-m/use.js')
  ).text()
);

// Build-in modules support
const os = await use('os');

// Relative paths support
const packageJson = await use('./package.json');

// NPM registry support (latest version)
const axios = await use('axios');
const _ = await use('lodash@latest');

// Fixed NPM package version support
const { $, sh } = await use('command-stream@0.0.5');