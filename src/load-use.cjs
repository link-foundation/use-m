async () => {
  const { join } = require('path');
  const { tmpdir } = require('os');
  const { randomBytes } = require('crypto');
  const { writeFile, rm, mkdir } = require('fs/promises');
  const moduleDirectory = join(tmpdir(), randomBytes(42).toString('hex'));
  await mkdir(moduleDirectory);
  await writeFile(
    join(moduleDirectory, 'use.cjs'), 
    await (
      await fetch('https://raw.githubusercontent.com/link-foundation/use-m/refs/heads/main/src/use.cjs')
    ).text()
  );
  await writeFile(
    join(moduleDirectory, 'use-module.cjs'), 
    await (
      await fetch('https://raw.githubusercontent.com/link-foundation/use-m/refs/heads/main/src/use-module.cjs')
    ).text()
  );
  const { use } = require(modulePath);
  await rm(moduleDirectory, { recursive: true, force: true });
  return use;
}