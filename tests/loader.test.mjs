import { describe, test, expect } from '../src/test-adapter.mjs';
import { resolve } from '../src/loader.js';

const moduleName = `[${import.meta.url.split('.').pop()} module]`;

// Builds a minimal stub for Node's `defaultResolve` hook argument.
const fakeDefaultResolve = (handler) => async (specifier, context, self) =>
  handler(specifier, context, self);

describe(`${moduleName} loader resolve hook`, () => {
  test(`${moduleName} returns the default resolver's result when it succeeds`, async () => {
    const fakeUrl = 'file:///fake/path/to/module.js';
    const defaultResolve = fakeDefaultResolve(async () => ({ url: fakeUrl }));
    const result = await resolve('some-package', {}, defaultResolve);
    expect(result).toEqual({ url: fakeUrl });
  });

  test(`${moduleName} falls back to the npm resolver when the default resolver throws`, async () => {
    // The npm resolver lazily installs a real package; we use a well-known tiny
    // package that's already a transitive dev dep of this repo's tests.
    const defaultResolve = fakeDefaultResolve(async () => {
      throw new Error('Cannot find package');
    });
    const result = await resolve('lodash@4.17.21', {}, defaultResolve);
    expect(typeof result.url).toBe('string');
    expect(result.url).toMatch(/^file:\/\//);
    expect(result.url).toMatch(/lodash/);
  }, 60000);

  test(`${moduleName} surfaces a clear aggregated error when BOTH resolvers fail`, async () => {
    const defaultResolve = fakeDefaultResolve(async () => {
      throw new Error('default-not-found');
    });
    let thrown;
    try {
      // A specifier that neither node nor the npm registry can resolve.
      await resolve('this-package-truly-does-not-exist-xyz-12345', {}, defaultResolve);
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeInstanceOf(Error);
    expect(thrown.message).toMatch(/Failed to resolve module: this-package-truly-does-not-exist-xyz-12345/);
    // The aggregated error must list BOTH attempts — that's the whole point of
    // routing this through the shared loadWithFallback engine.
    expect(thrown.message).toMatch(/node default resolver/);
    expect(thrown.message).toMatch(/use-m npm resolver/);
  }, 60000);
});
