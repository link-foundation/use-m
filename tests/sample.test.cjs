// CommonJS style test
const { sum } = require('../src/sample.cjs');

test('adds 1 + 2 to equal 3 (CommonJS)', () => {
  expect(sum(1, 2)).toBe(3);
});

// ESM style test using dynamic import
test('adds 1 + 2 to equal 3 (ESM)', async () => {
  const { sum: esmSum } = await import('../src/sample.mjs');
  expect(esmSum(1, 2)).toBe(3);
});

// CommonJS style test using dynamic require
test('adds 3 + 4 to equal 7 (dynamic require)', () => {
  const { sum: dynSum } = require('../src/sample.cjs');
  expect(dynSum(3, 4)).toBe(7);
});