import { makeUse } from '../use.mjs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { describe, test, expect, beforeAll, afterAll } from '../test-adapter.mjs';

// Mock jest object for Deno compatibility
const jest = typeof Deno !== 'undefined' ? { setTimeout: () => { } } : (await import('@jest/globals')).jest;

const moduleName = `[${import.meta.url.split('.').pop()} module]`;

// URL of use.mjs to test default scriptPath resolution
const useMjsUrl = new URL('../use.mjs', import.meta.url).href;

const currentFileUrl = import.meta.url;
const currentFilePath = fileURLToPath(currentFileUrl);
const currentDir = dirname(currentFilePath);

describe(`${moduleName} scriptPath detection in ESM (functional)`, () => {
  test(`${moduleName} default pathResolver resolves modules relative to use.mjs`, async () => {
    if (typeof Deno !== 'undefined') {
      return;
    }

    let capturedResolver;
    const stubSpecifierResolver = (specifier, pathResolver) => {
      capturedResolver = pathResolver;
      return currentFileUrl;
    };
    const useFn = await makeUse({ specifierResolver: stubSpecifierResolver });
    await useFn('anything');
    // resolver should resolve './package.json' relative to use.mjs
    const resolved = capturedResolver('./package.json');
    const expected = fileURLToPath(new URL('./package.json', useMjsUrl));
    expect(resolved).toBe(expected);
  });

  test(`${moduleName} override scriptPath resolves relative to provided path`, async () => {
    if (typeof Deno !== 'undefined') {
      return;
    }

    let capturedResolver;
    const stubSpecifierResolver = (specifier, pathResolver) => {
      capturedResolver = pathResolver;
      return currentFileUrl;
    };
    const explicitPath = currentFilePath;
    const useFn = await makeUse({ specifierResolver: stubSpecifierResolver, scriptPath: explicitPath });
    await useFn('anything');
    const resolved = capturedResolver('../package.json');
    const expected = join(dirname(explicitPath), '..', 'package.json');
    expect(resolved).toBe(expected);
  });
});

// Tests when global require is undefined (force createRequire fallback)
describe(`${moduleName} scriptPath detection in ESM (createRequire fallback)`, () => {
  let originalRequire;
  beforeAll(() => {
    originalRequire = global.require;
    delete global.require;
  });
  afterAll(() => {
    if (originalRequire) global.require = originalRequire;
  });

  test(`${moduleName} fallback default resolves modules relative to use.mjs`, async () => {
    if (typeof Deno !== 'undefined') {
      return;
    }

    let capturedResolver;
    const stubSpecifierResolver = (specifier, pathResolver) => {
      capturedResolver = pathResolver;
      return currentFileUrl;
    };
    const useFn = await makeUse({ specifierResolver: stubSpecifierResolver });
    await useFn('anything');
    const resolved = capturedResolver('./package.json');
    const expected = fileURLToPath(new URL('./package.json', useMjsUrl));
    expect(resolved).toBe(expected);
  });

  test(`${moduleName} fallback explicit scriptPath resolves relative to provided path`, async () => {
    if (typeof Deno !== 'undefined') {
      return;
    }

    let capturedResolver;
    const stubSpecifierResolver = (specifier, pathResolver) => {
      capturedResolver = pathResolver;
      return currentFileUrl;
    };
    const useFn = await makeUse({ specifierResolver: stubSpecifierResolver, scriptPath: currentFilePath });
    await useFn('anything');
    const resolved = capturedResolver('../package.json');
    const expected = join(currentDir, '..', 'package.json');
    expect(resolved).toBe(expected);
  });

  test(`${moduleName} fallback meta override changes pathResolver behavior in ESM`, async () => {
    if (typeof Deno !== 'undefined') {
      return;
    }

    let capturedResolver;
    const stubSpecifierResolver = (specifier, pathResolver) => {
      capturedResolver = pathResolver;
      return currentFileUrl;
    };
    // In ESM, providing a meta.url affects pathResolver
    // We need to use a valid path that exists to avoid errors
    const metaUrl = new URL('../use.mjs', import.meta.url).href;
    const useFn = await makeUse({ specifierResolver: stubSpecifierResolver, meta: { url: metaUrl } });
    await useFn('anything');
    const resolved = capturedResolver('./package.json');
    const expected = fileURLToPath(new URL('./package.json', metaUrl));
    expect(resolved).toBe(expected);
  });
});

// Additional test for meta.url with use.js path
describe(`${moduleName} scriptPath detection in ESM (meta URL)`, () => {
  test(`${moduleName} meta override resolves modules relative to provided meta URL (use.js)`, async () => {
    if (typeof Deno !== 'undefined') {
      return;
    }

    let capturedResolver;
    const stubSpecifierResolver = (specifier, pathResolver) => {
      capturedResolver = pathResolver;
      return currentFileUrl;
    };
    const metaUrl = new URL('../use.js', import.meta.url).href;
    const useFn = await makeUse({ specifierResolver: stubSpecifierResolver, meta: { url: metaUrl } });
    await useFn('anything');
    const resolved = capturedResolver('./use.js');
    const expected = fileURLToPath(metaUrl);
    expect(resolved).toBe(expected);
  });
}); 