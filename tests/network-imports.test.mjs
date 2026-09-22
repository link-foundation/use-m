import { describe, test, expect } from '../src/test-adapter.mjs';

const moduleName = `[${import.meta.url.split('.').pop()} module]`;

// `--experimental-network-imports` was removed in Node.js 22, so on the newer
// LTS lines there is no flag left to exercise. The probe tells that removal
// apart from a real failure: anything other than Node.js rejecting the option
// still fails the tests below.
const networkImportsFlagRemoved = async (execAsync) => {
  try {
    await execAsync('node --experimental-network-imports -e ""');
    return false;
  } catch (error) {
    return /bad option: --experimental-network-imports/.test(error.stderr || '');
  }
};

describe(`${moduleName} imports using --experimental-network-imports`, () => {
  test(`${moduleName} Import using --experimental-network-imports for CJS file`, async () => {
    const { exec } = await import('node:child_process');
    const { promisify } = await import('node:util');
    const execAsync = promisify(exec);
    if (await networkImportsFlagRemoved(execAsync)) {
      return;
    }
    const { stdout: sumOf1And2 } = await execAsync('node --experimental-network-imports ./examples/network-imports/index.cjs');
    const cleanResult = sumOf1And2.trim().replace(/\x1b\[[0-9;]*m/g, ''); // Remove ANSI color codes
    expect(cleanResult).toEqual("_.add(1, 2) = 3");
  });

  test(`${moduleName} Import using --experimental-network-imports for MJS file`, async () => {
    const { exec } = await import('node:child_process');
    const { promisify } = await import('node:util');
    const execAsync = promisify(exec);
    if (await networkImportsFlagRemoved(execAsync)) {
      return;
    }
    const { stdout: sumOf1And2 } = await execAsync('node --experimental-network-imports ./examples/network-imports/index.mjs');
    const cleanResult = sumOf1And2.trim().replace(/\x1b\[[0-9;]*m/g, ''); // Remove ANSI color codes
    expect(cleanResult).toEqual("_.add(1, 2) = 3");
  });
});
