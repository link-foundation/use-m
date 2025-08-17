const { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach } = require('../test-adapter.cjs');
const { makeUse } = require('../use.cjs');
const path = require('node:path');
const currentDir = path.dirname(__filename);
const moduleName = `[${__filename.split('.').pop()} module]`;

describe(`${moduleName} scriptPath detection in CJS (functional)`, () => {
  test(`${moduleName} default pathResolver resolves modules relative to this test file`, async () => {
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

  test(`${moduleName} override scriptPath does not change pathResolver behavior`, async () => {
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
describe(`${moduleName} scriptPath detection in CJS (fallback)`, () => {
  test(`${moduleName} fallback default resolves modules relative to this test file`, async () => {
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

  test(`${moduleName} fallback override scriptPath does not change pathResolver behavior`, async () => {
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

  test(`${moduleName} fallback meta override does not change pathResolver behavior`, async () => {
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

// Additional test for meta.url with use.js path
describe(`${moduleName} scriptPath detection in CJS (meta URL)`, () => {
  test(`${moduleName} meta override with use.js URL resolves relative to use.js`, async () => {
    let capturedResolver;
    const stubSpecifierResolver = (specifier, pathResolver) => {
      capturedResolver = pathResolver;
      return __filename;
    };
    const { pathToFileURL } = require('node:url');
    const metaUrl = pathToFileURL(path.resolve(__dirname, '..', 'use.js')).href;
    const useFn = await makeUse({ specifierResolver: stubSpecifierResolver, meta: { url: metaUrl } });
    await useFn('anything');
    const resolved = capturedResolver('./use.js');
    const expected = path.resolve(__dirname, '..', 'use.js');
    expect(resolved).toBe(expected);
  });
}); 