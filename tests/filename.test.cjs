const { makeUse } = require('../use.cjs');
const path = require('path');
const currentDir = path.dirname(__filename);

describe('scriptPath detection in CJS (functional)', () => {
  test('default pathResolver resolves modules relative to this test file', async () => {
    let capturedResolver;
    const stubSpecifierResolver = (specifier, pathResolver) => {
      capturedResolver = pathResolver;
      return __filename;
    };
    const useFn = await makeUse({ specifierResolver: stubSpecifierResolver });
    await useFn('anything');
    const resolved = capturedResolver('./package.json');
    const expected = path.resolve(currentDir, '..', 'package.json');
    expect(resolved).toBe(expected);
  });

  test('override scriptPath does not change pathResolver behavior', async () => {
    let capturedResolver;
    const stubSpecifierResolver = (specifier, pathResolver) => {
      capturedResolver = pathResolver;
      return __filename;
    };
    const useFn = await makeUse({ specifierResolver: stubSpecifierResolver, scriptPath: '/nonexistent/path.js' });
    await useFn('anything');
    const resolved = capturedResolver('./package.json');
    const expected = path.resolve(currentDir, '..', 'package.json');
    expect(resolved).toBe(expected);
  });
});

// Fallback tests (CJS always uses require.resolve, so behavior is identical)
describe('scriptPath detection in CJS (fallback)', () => {
  test('fallback default resolves modules relative to this test file', async () => {
    let capturedResolver;
    const stubSpecifierResolver = (specifier, pathResolver) => {
      capturedResolver = pathResolver;
      return __filename;
    };
    const useFn = await makeUse({ specifierResolver: stubSpecifierResolver });
    await useFn('anything');
    const resolved = capturedResolver('./package.json');
    const expected = path.resolve(currentDir, '..', 'package.json');
    expect(resolved).toBe(expected);
  });

  test('fallback override scriptPath does not change pathResolver behavior', async () => {
    let capturedResolver;
    const stubSpecifierResolver = (specifier, pathResolver) => {
      capturedResolver = pathResolver;
      return __filename;
    };
    const useFn = await makeUse({ specifierResolver: stubSpecifierResolver, scriptPath: '/nonexistent/path.js' });
    await useFn('anything');
    const resolved = capturedResolver('./package.json');
    const expected = path.resolve(currentDir, '..', 'package.json');
    expect(resolved).toBe(expected);
  });

  test('fallback meta override does not change pathResolver behavior', async () => {
    let capturedResolver;
    const stubSpecifierResolver = (specifier, pathResolver) => {
      capturedResolver = pathResolver;
      return __filename;
    };
    const useFn = await makeUse({ specifierResolver: stubSpecifierResolver, meta: { url: 'file:///foo/bar.js' } });
    await useFn('anything');
    const resolved = capturedResolver('./package.json');
    const expected = path.resolve(currentDir, '..', 'package.json');
    expect(resolved).toBe(expected);
  });
}); 