// Using local import for development/testing.
// In production, use: import("https://unpkg.com/use-m/use.mjs")
// Pin an exact published version when reproducibility matters.
import("../../src/use.mjs")
  .then(async ({ use }) => {
    const _ = await use("lodash@4.17.21");
    console.log(`_.add(1, 2) = ${_.add(1, 2)}`);
  });
