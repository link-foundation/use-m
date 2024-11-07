// supportsDynamicImport.mjs.test.js

const supportsDynamicImport = async () => {
  try {
    await new Function('return import("data:text/javascript,")')();
    return true;
  } catch (e) {
    return false;
  }
};

test('supportsDynamicImport returns true in .mjs file', async () => {
  const result = await supportsDynamicImport();
  expect(result).toBe(true);
});