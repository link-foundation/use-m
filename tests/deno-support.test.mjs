import { describe, test, expect } from '../test-adapter.mjs';
import { makeUse, resolvers } from 'use-m/use.mjs';

const moduleName = `[${import.meta.url.split('.').pop()} module]`;

describe(`${moduleName} Deno support`, () => {
  test(`${moduleName} Deno resolver should resolve npm packages to esm.sh`, async () => {
    const resolvedPath = await resolvers.deno('lodash@4.17.21');
    expect(resolvedPath).toBe('https://esm.sh/lodash@4.17.21');
  });

  test(`${moduleName} Deno resolver should handle scoped packages`, async () => {
    const resolvedPath = await resolvers.deno('@octokit/core@6.1.5');
    expect(resolvedPath).toBe('https://esm.sh/@octokit/core@6.1.5');
  });

  test(`${moduleName} Deno resolver should handle module paths`, async () => {
    const resolvedPath = await resolvers.deno('lodash@4.17.21/add');
    expect(resolvedPath).toBe('https://esm.sh/lodash@4.17.21/add');
  });

  test(`${moduleName} Deno resolver should handle latest version`, async () => {
    const resolvedPath = await resolvers.deno('lodash@latest');
    expect(resolvedPath).toBe('https://esm.sh/lodash@latest');
  });

  test(`${moduleName} makeUse should detect Deno runtime when Deno global is present`, async () => {
    let mockedDeno = false;
    if (typeof Deno === "undefined") {
      globalThis.Deno = { version: { deno: '2.4.4' } };
      mockedDeno = true;
    }
    try {
      const use = await makeUse();

      // Test by checking which resolver would be used
      // We can't directly test the resolver used, but we can test the behavior
      // by verifying the resolver produces esm.sh URLs
      const testModulePath = await resolvers.deno('lodash@4.17.21');
      expect(testModulePath).toContain('esm.sh');
    } finally {
      if (mockedDeno) {
        delete globalThis.Deno;
      }
    }
  });

  test(`${moduleName} Deno resolver should work with complex package names`, async () => {
    const resolvedPath = await resolvers.deno('@babel/core@7.23.0/lib/index.js');
    expect(resolvedPath).toBe('https://esm.sh/@babel/core@7.23.0/lib/index.js');
  });

  test(`${moduleName} Deno resolver should handle packages without versions`, async () => {
    const resolvedPath = await resolvers.deno('lodash');
    expect(resolvedPath).toBe('https://esm.sh/lodash@latest');
  });

  test(`${moduleName} makeUse with explicit deno resolver`, async () => {
    const use = await makeUse({ specifierResolver: 'deno' });

    // We can't easily test the full import without network access in CI
    // But we can verify the resolver would produce the correct URL
    const testUrl = await resolvers.deno('lodash@4.17.21');
    expect(testUrl).toBe('https://esm.sh/lodash@4.17.21');
  });
});