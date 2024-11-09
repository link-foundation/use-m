const supportsDynamicImport = async () => {
  try {
    await new Function('return import("data:text/javascript,")')();
    return true;
  } catch (e) {
    return false;
  }
};

test('supportsDynamicImport returns true in .cjs file', async () => {
  expect(await supportsDynamicImport()).toBe(true);
});