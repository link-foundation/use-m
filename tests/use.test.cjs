describe(`'use' import strategies (CJS)`, () => {
  test('Direct CJS Require', async () => {
    const { use } = require('../use.cjs');
    const _ = await use("lodash@4.17.21");
    const result = _.add(2, 3);
    expect(result).toBe(5);
  });

  // New Test Case: Dynamic import with `await import()` directly
  test('Dynamic Import with await import() of CJS', async () => {
    const { use } = await import(require.resolve('../use.cjs'));
    const _ = await use("lodash@4.17.21");
    const result = _.add(2, 3);
    expect(result).toBe(5);
  });

  // New Test Case: Dynamic import with `await import()` directly
  test('Dynamic Import with await import() of MJS', async () => {
    const { use } = await import(require.resolve('../use.mjs'));
    const _ = await use("lodash@4.17.21");
    const result = _.add(2, 3);
    expect(result).toBe(5);
  });

  test('Universal (then style)', async () => {
    const use = await fetch('https://unpkg.com/use-m@6/use.js')
      .then((response) => response.text())
      .then((code) => eval(code)());
    const _ = await use('lodash@4.17.21');
    const result = _.add(1, 2);
    expect(result).toBe(3);
  });

  test('Universal (eval style)', async () => {
    const use = await eval(
      await fetch('https://unpkg.com/use-m@6/use.js')
        .then(response => response.text())
    )();
    const _ = await use('lodash@4.17.21');
    const result = _.add(1, 2);
    expect(result).toBe(3);
  });
});