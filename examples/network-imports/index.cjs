import("https://unpkg.com/use-m/use.mjs")
  .then(async ({ use }) => {
    const _ = await use("lodash@4.17.21");
    console.log(`_.add(1, 2) = ${_.add(1, 2)}`);
  });