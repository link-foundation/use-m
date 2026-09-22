// Import use-m directly from CDN without local installation.
// Pinned to a published version for reproducibility. To follow the current
// release instead, use `https://unpkg.com/use-m/use.mjs`.
const { use } = await import("https://unpkg.com/use-m@8.13.8/use.mjs");
// Alternative CDN: const { use } = await import('https://esm.sh/use-m');
const _ = await use('lodash@4.17.21');
console.log(`_.add(1, 2) = ${_.add(1, 2)}`);
