import { use as staticUse } from 'use-m';

describe(`'use' import strategies`, () => {
  test('Direct ESM Import lodash@4.17.21', async () => {
    const use = staticUse;
    const _ = await use("lodash@4.17.21");
    expect(_.add(1, 2)).toBe(3);
  });

  test('Dynamic ESM Import of CSJ', async () => {
    const { use } = await import('use-m/use.cjs');
    const _ = await use("lodash@4.17.21");
    expect(_.add(1, 2)).toBe(3);
  });

  test('Dynamic ESM Import of MJS', async () => {
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
        .then(code => code.text())
    );
    const _ = await use('lodash@4.17.21');
    expect(_.add(1, 2)).toBe(3);
  });

  test('Universal (single then style)', async () => {
    await fetch('https://unpkg.com/use-m/use.js')
      .then(async code => {
        const { use } = eval(await code.text());
        const _ = await use('lodash@4.17.21');
        expect(_.add(1, 2)).toBe(3);
      });
  });

  test('use.all (cjs)', async () => {
    const { createRequire } = await import('module');
    const require = createRequire(import.meta.url);
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
    const { use } = await import('use-m');
    const { Octokit } = await use('@octokit/core');
    const octokit = new Octokit();
    expect(octokit).toBeDefined();
  });
});