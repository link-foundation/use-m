async () => {
  const { join } = require('path');
  const { tmpdir } = require('os');
  const { randomBytes } = require('crypto');
  const { writeFile, rm, mkdir } = require('fs/promises');
  const moduleDirectory = join(tmpdir(), randomBytes(42).toString('hex'));
  await mkdir(moduleDirectory);
  const functionResponse = await fetch('https://raw.githubusercontent.com/Konard/use/refs/heads/main/src/use.cjs');
  const functionPath = join(moduleDirectory, 'use.cjs');
  await writeFile(functionPath, await functionResponse.text());
  const moduleResponse = await fetch('https://raw.githubusercontent.com/Konard/use/refs/heads/main/src/use-module.cjs');
  const modulePath = join(moduleDirectory, 'use-module.cjs');
  await writeFile(modulePath, await moduleResponse.text());
  const { use } = require(modulePath);
  await rm(moduleDirectory, { recursive: true, force: true });
  return use;
}