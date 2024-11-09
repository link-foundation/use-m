#!/usr/bin/env zx --verbose

await $`./examples/zx/example.mjs`;
await $`node ./examples/execa/example.mjs`;

cd('./examples/cjs');
await $`npm i use-m@latest`;
await $`npm run start`;

cd('../mjs');
await $`yarn add use-m@latest`;
await $`yarn start`;
