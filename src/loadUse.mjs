async () => {
  const { join } = await import('path');
  const { tmpdir } = await import('os');
  const { randomBytes } = await import('crypto');
  const { writeFile, unlink } = await import('fs/promises');
  const response = await fetch('https://raw.githubusercontent.com/Konard/use/refs/heads/main/src/use.mjs');
  const localUsePath = join(tmpdir(), randomBytes(42).toString('hex') + '.mjs');
  await writeFile(localUsePath, await response.text());
  const { use } = await import(localUsePath);
  await unlink(localUsePath);
  return use;
}