#!/usr/bin/env zx --verbose

await $`./examples/zx/example.mjs`;
await $`node ./examples/execa/example.mjs`;

cd('./examples/cjs');
await $`npm run start`;

cd('../mjs');
await $`yarn start`;
