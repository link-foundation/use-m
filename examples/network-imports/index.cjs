// Using local import for development/testing.
// In production, use: import("https://unpkg.com/use-m/src/use.mjs")
// (after the release that ships the src/ layout; before that, pin to a
// published version+path that exists, e.g. use-m@8.13.8/use.mjs).
import("../../src/use.mjs")
  .then(async ({ use }) => {
    const _ = await use("lodash@4.17.21");
    console.log(`_.add(1, 2) = ${_.add(1, 2)}`);
  });