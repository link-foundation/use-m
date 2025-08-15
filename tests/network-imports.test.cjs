describe(`Imports using --experimental-network-imports`, () => {
  test('[CJS Runtime] Import using --experimental-network-imports', async () => {
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);
    const { stdout: sumOf1And2 } = await execAsync('node --experimental-network-imports ./examples/network-imports/index.cjs');
    const cleanResult = sumOf1And2.trim().replace(/\x1b\[[0-9;]*m/g, ''); // Remove ANSI color codes
    expect(cleanResult).toEqual("_.add(1, 2) = 3");
  });

  test('[CJS Runtime] Import using --experimental-network-imports (MJS example)', async () => {
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);
    const { stdout: sumOf1And2 } = await execAsync('node --experimental-network-imports ./examples/network-imports/index.mjs');
    const cleanResult = sumOf1And2.trim().replace(/\x1b\[[0-9;]*m/g, ''); // Remove ANSI color codes
    expect(cleanResult).toEqual("_.add(1, 2) = 3");
  });
});