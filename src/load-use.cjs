async () => {
  const { join } = await require('path');
  const { tmpdir } = await require('os');
  const { randomBytes } = await require('crypto');
  const { writeFile, rm, mkdir } = await require('fs/promises');
  const moduleDirectory = join(tmpdir(), randomBytes(42).toString('hex'));
  await mkdir(moduleDirectory);
  await writeFile(
    join(moduleDirectory, 'use.cjs'), 
    await (
      await fetch('https://raw.githubusercontent.com/link-foundation/use-m/refs/heads/main/src/use.cjs')
    ).text()
  );
  await writeFile(
    join(moduleDirectory, 'resolvers.cjs'),
    await (
      await fetch('https://raw.githubusercontent.com/link-foundation/use-m/refs/heads/main/src/resolvers.cjs')
    ).text()
  );å
  const modulePath = join(moduleDirectory, 'use-m.cjs');
  await writeFile(
    modulePath,
    await (
      await fetch('https://raw.githubusercontent.com/link-foundation/use-m/refs/heads/main/src/use-m.cjs')
    ).text()
  );
  const { use } = await require(modulePath);
  await rm(moduleDirectory, { recursive: true, force: true });
  return use;
}