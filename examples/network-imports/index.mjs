// Import use-m directly from CDN without local installation
const { use } = await import("https://unpkg.com/use-m/use.mjs");
// Alternative CDN: const { use } = await import('https://esm.sh/use-m');
const _ = await use('lodash@4.17.21');
console.log(`_.add(1, 2) = ${_.add(1, 2)}`);