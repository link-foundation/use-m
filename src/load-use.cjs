async () => {
  const { join } = require('path');
  const { tmpdir } = require('os');
  const { randomBytes } = require('crypto');
  const { writeFile, unlink } = require('fs/promises');
  const response = await fetch('https://raw.githubusercontent.com/Konard/use/refs/heads/main/src/use-module.cjs');
  const localUsePath = join(tmpdir(), randomBytes(42).toString('hex') + '.cjs');
  await writeFile(localUsePath, await response.text());
  const { use } = require(localUsePath);
  await unlink(localUsePath);
  return use;
}