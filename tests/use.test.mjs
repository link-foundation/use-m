import { use as staticUse } from 'use-m';

describe(`'use' import strategies`, () => {
  test('Direct ESM Import', async () => {
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
        .then(response => response.text())
    );
    const _ = await use('lodash@4.17.21');
    expect(_.add(1, 2)).toBe(3);
  });
});