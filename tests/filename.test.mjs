import { makeUse } from '../use.mjs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { jest } from '@jest/globals';

// URL of use.mjs to test default scriptPath resolution
const useMjsUrl = new URL('../use.mjs', import.meta.url).href;

const currentFileUrl = import.meta.url;
const currentFilePath = fileURLToPath(currentFileUrl);
const currentDir = dirname(currentFilePath);

describe('[MJS Runtime] scriptPath detection in ESM (functional)', () => {
  test('[MJS Runtime] default pathResolver resolves modules relative to use.mjs', async () => {
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

  test('[MJS Runtime] override scriptPath resolves relative to provided path', async () => {
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
describe('[MJS Runtime] scriptPath detection in ESM (createRequire fallback)', () => {
  let originalRequire;
  beforeAll(() => {
    originalRequire = global.require;
    delete global.require;
  });
  afterAll(() => {
    if (originalRequire) global.require = originalRequire;
  });

  test('[MJS Runtime] fallback default resolves modules relative to use.mjs', async () => {
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

  test('[MJS Runtime] fallback explicit scriptPath resolves relative to provided path', async () => {
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

  test('[MJS Runtime] fallback meta override changes pathResolver behavior in ESM', async () => {
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
describe('[MJS Runtime] scriptPath detection in ESM (meta URL)', () => {
  test('[MJS Runtime] meta override resolves modules relative to provided meta URL (use.js)', async () => {
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