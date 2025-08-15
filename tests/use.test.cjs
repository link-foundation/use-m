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

  test('use.all (cjs)', async () => {
    const { use } = require('use-m');
    const [
      lodash3, 
      lodash4
    ] = await use.all(
      'lodash@3',
      'lodash@4'
    );
    expect(lodash3.add(1, 2)).toBe(3);
    expect(lodash4.add(1, 2)).toBe(3);
  });

  test('use.all (mjs)', async () => {
    const { use } = await import('use-m');
    const [
      lodash3, 
      lodash4
    ] = await use.all(
      'lodash@3',
      'lodash@4'
    );
    expect(lodash3.add(1, 2)).toBe(3);
    expect(lodash4.add(1, 2)).toBe(3);
  });

  test('use.all (script)', async () => {
    await fetch('https://unpkg.com/use-m/use.js')
      .then(async useJs => {
        const { use } = eval(await useJs.text());
        const [
          lodash3, 
          lodash4
        ] = await use.all(
          'lodash@3',
          'lodash@4'
        );
        expect(lodash3.add(1, 2)).toBe(3);
        expect(lodash4.add(1, 2)).toBe(3);
      });
  });

  // Test for https://github.com/link-foundation/use-m/issues/16 issue

  test('Universal (script) @octokit/core@6.1.5', async () => {
    await fetch('https://unpkg.com/use-m/use.js')
      .then(async useJs => {
        const { use } = eval
          (await useJs.text());
        const { Octokit } = await use('@octokit/core@6.1.5');
        const octokit = new Octokit();
        expect(octokit).toBeDefined();
      });
  });

  test('Universal (script) @octokit/core@5', async () => {
    await fetch('https://unpkg.com/use-m/use.js')
      .then(async useJs => {
        const { use } = eval
          (await useJs.text());
        const { Octokit } = await use('@octokit/core@5');
        const octokit = new Octokit();
        expect(octokit).toBeDefined();
      });
  });

  test('Universal (script) @octokit/core (latest)', async () => {
    await fetch('https://unpkg.com/use-m/use.js')
      .then(async useJs => {
        const { use } = eval
          (await useJs.text());
        const { Octokit } = await use('@octokit/core');
        const octokit = new Octokit();
        expect(octokit).toBeDefined();
      });
  });

  test('@octokit/core (latest)', async () => {
    const { use } = require('use-m');
    const { Octokit } = await use('@octokit/core');
    const octokit = new Octokit();
    expect(octokit).toBeDefined();
  });
});