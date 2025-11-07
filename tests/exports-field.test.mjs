import { use } from '../use.mjs';
import { describe, test, expect } from '../test-adapter.mjs';

// Mock jest object for Deno compatibility
const jest = typeof Deno !== 'undefined' ? { setTimeout: () => {} } : (await import('@jest/globals')).jest;

const moduleName = `[${import.meta.url.split('.').pop()} module]`;

jest.setTimeout(60000);

describe(`${moduleName} exports field handling tests`, () => {
  // Test for issue #47: Cannot import sub-paths like 'yargs/helpers'
  test(`${moduleName} should import yargs/helpers using exports field`, async () => {
    const helpers = await use('yargs/helpers');
    expect(helpers).toBeDefined();
    expect(typeof helpers).toBe('object');
    expect(typeof helpers.hideBin).toBe('function');
  });

  test(`${moduleName} should import yargs main module`, async () => {
    const yargs = await use('yargs');
    expect(yargs).toBeDefined();
    expect(typeof yargs).toBe('object');
  });

  test(`${moduleName} should import yargs@17.7.2/helpers`, async () => {
    const helpers = await use('yargs@17.7.2/helpers');
    expect(helpers).toBeDefined();
    expect(typeof helpers).toBe('object');
    expect(typeof helpers.hideBin).toBe('function');
  });

  test(`${moduleName} should import yargs@18.0.0/helpers`, async () => {
    const helpers = await use('yargs@18.0.0/helpers');
    expect(helpers).toBeDefined();
    expect(typeof helpers).toBe('object');
    expect(typeof helpers.hideBin).toBe('function');
  });

  // Test the hideBin function actually works
  test(`${moduleName} yargs/helpers hideBin should work correctly`, async () => {
    const { hideBin } = await use('yargs/helpers');
    const testArgs = ['node', 'script.js', 'arg1', 'arg2'];
    const result = hideBin(testArgs);
    expect(result).toEqual(['arg1', 'arg2']);
  });

  // Test that main package import still works
  test(`${moduleName} should import @octokit/core using exports field`, async () => {
    const { Octokit } = await use('@octokit/core@6.1.5');
    expect(Octokit).toBeDefined();
    expect(typeof Octokit).toBe('function');
  });
});
