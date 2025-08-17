const { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach } = require('../test-adapter.cjs');

const moduleName = `[${__filename.split('.').pop()} module]`;

describe(`${moduleName} imports using --experimental-network-imports`, () => {
  test(`${moduleName} Import using --experimental-network-imports for CJS file`, async () => {
    const { exec } = await import('node:child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);
    const { stdout: sumOf1And2 } = await execAsync('node --experimental-network-imports ./examples/network-imports/index.cjs');
    const cleanResult = sumOf1And2.trim().replace(/\x1b\[[0-9;]*m/g, ''); // Remove ANSI color codes
    expect(cleanResult).toEqual("_.add(1, 2) = 3");
  });

  test(`${moduleName} Import using --experimental-network-imports for MJS file`, async () => {
    const { exec } = await import('node:child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);
    const { stdout: sumOf1And2 } = await execAsync('node --experimental-network-imports ./examples/network-imports/index.mjs');
    const cleanResult = sumOf1And2.trim().replace(/\x1b\[[0-9;]*m/g, ''); // Remove ANSI color codes
    expect(cleanResult).toEqual("_.add(1, 2) = 3");
  });
});