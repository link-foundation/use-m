import { use as staticUse } from 'use-m';

describe(`'use' import strategies`, () => {
  test('Direct ESM Import', async () => {
    const use = staticUse;
    const _ = await use("lodash@4.17.21");
    const result = _.add(2, 3);
    expect(result).toBe(5);
  });

  test('Dynamic ESM Import of CSJ', async () => {
    const { use } = await import('use-m/use.cjs');
    const _ = await use("lodash@4.17.21");
    const result = _.add(2, 3);
    expect(result).toBe(5);
  });

  test('Dynamic ESM Import of MJS', async () => {
    const { use } = await import('use-m/use.mjs');
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