const { describe, test, expect } = require('@jest/globals');
const { makeUse } = require('../use.cjs');
const path = require('path');
const currentDir = path.dirname(__filename);
const runtime = `[${__filename.split('.').pop()} runtime]`;

describe(`${runtime} scriptPath detection in CJS (functional)`, () => {
  test(`${runtime} default pathResolver resolves modules relative to this test file`, async () => {
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

  test(`${runtime} override scriptPath does not change pathResolver behavior`, async () => {
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
describe(`${runtime} scriptPath detection in CJS (fallback)`, () => {
  test(`${runtime} fallback default resolves modules relative to this test file`, async () => {
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

  test(`${runtime} fallback override scriptPath does not change pathResolver behavior`, async () => {
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

  test(`${runtime} fallback meta override does not change pathResolver behavior`, async () => {
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
describe(`${runtime} scriptPath detection in CJS (meta URL)`, () => {
  test(`${runtime} meta override with use.js URL resolves relative to use.js`, async () => {
    let capturedResolver;
    const stubSpecifierResolver = (specifier, pathResolver) => {
      capturedResolver = pathResolver;
      return __filename;
    };
    const { pathToFileURL } = require('url');
    const metaUrl = pathToFileURL(path.resolve(__dirname, '..', 'use.js')).href;
    const useFn = await makeUse({ specifierResolver: stubSpecifierResolver, meta: { url: metaUrl } });
    await useFn('anything');
    const resolved = capturedResolver('./use.js');
    const expected = path.resolve(__dirname, '..', 'use.js');
    expect(resolved).toBe(expected);
  });
}); 