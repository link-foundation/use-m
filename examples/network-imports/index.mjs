const { use } = await import("https://unpkg.com/use-m/use.mjs"); // TODO: replace with import("https://unpkg.com/use-m/use.mjs")
// const { use } = await import('https://esm.sh/use-m@8.8.0');
const _ = await use('lodash@4.17.21');
console.log(`_.add(1, 2) = ${_.add(1, 2)}`);