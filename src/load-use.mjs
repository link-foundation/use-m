async () => {
  const { join } = await import('path');
  const { tmpdir } = await import('os');
  const { randomBytes } = await import('crypto');
  const { writeFile, rm, mkdir } = await import('fs/promises');
  const moduleDirectory = join(tmpdir(), randomBytes(42).toString('hex'));
  await mkdir(moduleDirectory);
  await writeFile(
    join(moduleDirectory, 'resolvers.mjs'),
    await (
      await fetch('https://unpkg.com/use-m/src/resolvers.mjs')
    ).text()
  );
  const modulePath = join(moduleDirectory, 'use-m.mjs');
  await writeFile(
    modulePath,
    await (
      await fetch('https://unpkg.com/use-m/src/use-m.mjs')
    ).text()
  );
  const { use } = await import(modulePath);
  await rm(moduleDirectory, { recursive: true, force: true });
  return use;
}