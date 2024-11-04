async () => {
  const { join } = await import('path');
  const { tmpdir } = await import('os');
  const { randomBytes } = await import('crypto');
  const { writeFile, unlink } = await import('fs/promises');
  const moduleDirecotry = join(tmpdir(), randomBytes(42).toString('hex'));
  const functionResponse = await fetch('https://raw.githubusercontent.com/Konard/use/refs/heads/main/src/use.mjs');
  const functionPath = join(moduleDirecotry, 'use.mjs');
  await writeFile(functionPath, await functionResponse.text());
  const moduleResponse = await fetch('https://raw.githubusercontent.com/Konard/use/refs/heads/main/src/use-module.mjs');
  const modulePath = join(moduleDirecotry, 'use-module.mjs');
  await writeFile(modulePath, await moduleResponse.text());
  const { use } = require(modulePath);
  await unlink(modulePath);
  return use;
}