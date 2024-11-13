describe(`'use' import strategies (CJS)`, () => {
  test('Direct CJS Require', async () => {
    const { use } = require('use-m');
    const _ = await use("lodash@4.17.21");
    expect(_.add(1, 2)).toBe(3);
  });

  // New Test Case: Dynamic import with `await import()` directly
  test('Dynamic Import with await import() of CJS', async () => {
    const { use } = await import('use-m/use.cjs');
    const _ = await use("lodash@4.17.21");
    expect(_.add(1, 2)).toBe(3);
  });

  // New Test Case: Dynamic import with `await import()` directly
  test('Dynamic Import with await import() of MJS', async () => {
    const { use } = await import('use-m/use.mjs');
    const _ = await use("lodash@4.17.21");
    expect(_.add(1, 2)).toBe(3);
  });

  test('Universal (then style)', async () => {
    const { use } = await fetch('https://unpkg.com/use-m/use.js')
      .then(response => response.text())
      .then(code => eval(code));
    const _ = await use('lodash@4.17.21');
    expect(_.add(1, 2)).toBe(3);
  });

  test('Universal (then style, use inside) with CJS', async () => {
    await fetch('https://unpkg.com/use-m/use.js')
      .then(response => response.text())
      .then(code => eval(code))
      .then(async ({ use }) => {
        const _ = await use('lodash@4.17.21');
        expect(_.add(1, 2)).toBe(3);
      });
  });

  test('Universal (eval style)', async () => {
    const { use } = eval(
      await fetch('https://unpkg.com/use-m/use.js')
        .then(useJs => useJs.text())
    );
    const _ = await use('lodash@4.17.21');
    expect(_.add(1, 2)).toBe(3);
  });

  test('Universal (single then style)', async () => {
    await fetch('https://unpkg.com/use-m/use.js')
      .then(async useJs => {
        const { use } = eval(await useJs.text());
        const _ = await use('lodash@4.17.21');
        expect(_.add(1, 2)).toBe(3);
      });
  });

  test('Import using --experimental-network-imports', async () => {
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);
    const { stdout: sumOf1And2 } = await execAsync('node --experimental-network-imports ./examples/network-imports/index.mjs');
    const cleanResult = sumOf1And2.trim().replace(/\x1b\[[0-9;]*m/g, ''); // Remove ANSI color codes
    expect(cleanResult).toEqual("_.add(1, 2) = 3");
  });
});