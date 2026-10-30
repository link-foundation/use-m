const { mkdir, readFile, readdir, writeFile } = require('node:fs/promises');
const path = require('node:path');
const { describe, test, expect, afterEach } = require('../src/test-adapter.cjs');
const { makeUse, resolvers, use: sharedUse } = require('use-m');
const { createEngineFixture, enginePackument } = require('./fixtures/npm-engines.cjs');
const resolve = require.resolve;

const temporaryFixtures = [];
afterEach(async () => {
  await Promise.all(temporaryFixtures.splice(0).map(fixture => fixture.cleanup()));
});
const fixtureFor = async (metadata = enginePackument()) => {
  const fixture = await createEngineFixture(metadata);
  temporaryFixtures.push(fixture);
  return fixture;
};
const installedVersions = async fixture => (await fixture.calls())
  .filter(args => args[0] === 'install').map(args => args.find(arg => arg.includes('@npm:')).split('@').pop());

describe('Node engine compatible npm resolution', () => {
  for (const selector of ['', '@latest', '@*', '@>=1 <3', '@^1.0.0', '@1.x', '@~1.10.0', '@1.0.0 - 2.0.0', '@^1 || ^2']) {
    test(`selects the newest compatible stable release for ${selector || 'implicit latest'}`, async () => {
      const fixture = await fixtureFor();
      await resolvers.npm(`fixture-pkg${selector}`, resolve, fixture.options);
      expect(await installedVersions(fixture)).toEqual(['1.10.0']);
    });
  }

  test('checks engines against the running Node version', async () => {
    const metadata = enginePackument();
    metadata.versions['2.0.0'].engines.node = process.versions.node;
    const fixture = await fixtureFor(metadata);
    await resolvers.npm('fixture-pkg', resolve, fixture.options);
    expect(await installedVersions(fixture)).toEqual(['2.0.0']);
  });

  test('supports compound engine ranges and packages without engines', async () => {
    const metadata = enginePackument();
    metadata.versions['1.10.0'].engines.node = '18.x || >=20 <999';
    delete metadata.versions['1.2.0'].engines;
    const fixture = await fixtureFor(metadata);
    await resolvers.npm('fixture-pkg', resolve, fixture.options);
    expect(await installedVersions(fixture)).toEqual(['1.10.0']);
  });

  test('fails before install when the requested range has no compatible release', async () => {
    const fixture = await fixtureFor();
    await expect(resolvers.npm('fixture-pkg@^2', resolve, fixture.options))
      .rejects.toThrow(/fixture-pkg.*Node.*999.*running/);
    expect(await installedVersions(fixture)).toEqual([]);
  });

  test('does not bypass an engine failure through CLI or stale installed metadata', async () => {
    const metadata = enginePackument();
    delete metadata.versions['1.2.0'];
    delete metadata.versions['1.10.0'];
    const fixture = await fixtureFor(metadata);
    await expect(resolvers.npm('fixture-pkg', resolve, { ...fixture.options, registryCliFallback: true }))
      .rejects.toThrow(/pin a version or upgrade Node/i);
    expect((await fixture.calls()).some(args => ['install', 'view', 'show'].includes(args[0]))).toBe(false);
  });

  test('logs the rejected latest version and chosen fallback', async () => {
    const fixture = await fixtureFor();
    await resolvers.npm('fixture-pkg', resolve, fixture.options);
    expect(fixture.messages.join('\n')).toMatch(/fixture-pkg@latest.*2\.0\.0.*999.*1\.10\.0.*Node/);
  });

  test('handles scoped packages and package subpaths', async () => {
    const fixture = await fixtureFor();
    await resolvers.npm('@scope/fixture-pkg@>=1 <3/index.js', resolve, fixture.options);
    expect(await installedVersions(fixture)).toEqual(['1.10.0']);
  });

  test('allows an explicitly requested prerelease range', async () => {
    const fixture = await fixtureFor();
    await resolvers.npm('fixture-pkg@>=3.0.0-beta.1 <3.0.0', resolve, fixture.options);
    expect(await installedVersions(fixture)).toEqual(['3.0.0-beta.1']);
  });

  test('uses engine metadata from the npm CLI fallback', async () => {
    const fixture = await fixtureFor();
    await resolvers.npm('fixture-pkg', resolve, { ...fixture.options,
      registryCliFallback: true, fetch: async () => { throw new Error('offline'); },
    });
    expect(await installedVersions(fixture)).toEqual(['1.10.0']);
    expect((await fixture.calls()).some(args => args[0] === 'view')).toBe(true);
  });

  test('supports an opt-out per instance and does not contaminate strict caches', async () => {
    const fixture = await fixtureFor();
    const fetch = async url => ({ok: true, json: async () => url.endsWith('/latest')
      ? {version: '2.0.0', engines: {node: '>=999'}} : enginePackument()});
    await resolvers.npm('fixture-pkg', resolve, { ...fixture.options, fetch, engineStrict: false });
    await resolvers.npm('fixture-pkg', resolve, { ...fixture.options, fetch });
    expect(await installedVersions(fixture)).toEqual(['2.0.0', '1.10.0']);
  });

  test('supports an environment opt-out and an explicit strict override', async () => {
    const fixture = await fixtureFor();
    fixture.options.env.USE_M_ENGINE_STRICT = 'false';
    const fetch = async url => ({ok: true, json: async () => url.endsWith('/latest')
      ? {version: '2.0.0'} : enginePackument()});
    await resolvers.npm('fixture-pkg', resolve, { ...fixture.options, fetch });
    await resolvers.npm('fixture-pkg', resolve, { ...fixture.options, fetch, engineStrict: true });
    expect(await installedVersions(fixture)).toEqual(['2.0.0', '1.10.0']);
  });

  test('keeps exact pins and named tags explicit without metadata lookup', async () => {
    const fixture = await fixtureFor();
    const fetch = async () => { throw new Error('explicit requests must not fetch'); };
    await resolvers.npm('fixture-pkg@2.0.0', resolve, { ...fixture.options, fetch });
    await resolvers.npm('fixture-pkg@next', resolve, { ...fixture.options, fetch });
    expect(await installedVersions(fixture)).toEqual(['2.0.0', 'next']);
  });

  test('isolates cache decisions across Node upgrades in the reported command-stream incident', async () => {
    const metadata = { versions: {
      '1.6.2': { version: '1.6.2', engines: { node: '>=20.0.0' } },
      '2.0.0': { version: '2.0.0', engines: { node: '>=22.0.0' } },
    } };
    const fixture = await fixtureFor(metadata);
    const descriptor = Object.getOwnPropertyDescriptor(process.versions, 'node');
    try {
      Object.defineProperty(process.versions, 'node', { configurable: true, value: '20.20.2' });
      await resolvers.npm('command-stream', resolve, fixture.options);
      Object.defineProperty(process.versions, 'node', { configurable: true, value: '22.0.0' });
      await resolvers.npm('command-stream', resolve, fixture.options);
      expect(await installedVersions(fixture)).toEqual(['1.6.2', '2.0.0']);
    } finally {
      Object.defineProperty(process.versions, 'node', descriptor);
    }
  });

  test('keeps range caches separate and refreshes moving aliases', async () => {
    const fixture = await fixtureFor();
    await resolvers.npm('fixture-pkg@^1', resolve, fixture.options);
    await resolvers.npm('fixture-pkg@~1.2', resolve, fixture.options);
    expect(await installedVersions(fixture)).toEqual(['1.10.0', '1.2.0']);
    expect((await readdir(path.join(fixture.root, 'cache'))).length).toBe(2);
    const metadata = enginePackument();
    metadata.versions['1.11.0'] = { version: '1.11.0' };
    await resolvers.npm('fixture-pkg@^1', resolve, { ...fixture.options, latestVersionCache: false,
      fetch: async () => ({ ok: true, json: async () => metadata }),
    });
    expect(await installedVersions(fixture)).toEqual(['1.10.0', '1.2.0', '1.11.0']);
  });

  test('uses stale compatible metadata during an outage', async () => {
    const fixture = await fixtureFor();
    await resolvers.npm('fixture-pkg', resolve, fixture.options);
    await new Promise(done => setTimeout(done, 5));
    await resolvers.npm('fixture-pkg', resolve, { ...fixture.options,
      latestVersionCacheTtlMs: 0, fetch: async () => { throw new Error('offline'); },
    });
    expect(await installedVersions(fixture)).toEqual(['1.10.0']);
    expect(fixture.messages.join('\n')).toContain('stale cached compatible version');
  });

  test('rejects an incompatible installed alias when offline', async () => {
    const fixture = await fixtureFor();
    const alias = path.join(fixture.modules, 'fixture-pkg-v-latest');
    await mkdir(alias, { recursive: true });
    await writeFile(path.join(alias, 'package.json'), JSON.stringify({ version: '2.0.0', engines: { node: '>=999' } }));
    await expect(resolvers.npm('fixture-pkg', resolve, { ...fixture.options,
      fetch: async () => { throw new Error('offline'); },
    })).rejects.toThrow(/requires Node >=999/);
    expect(await installedVersions(fixture)).toEqual([]);
  });

  test('accepts an installed compatible alias during an outage', async () => {
    const fixture = await fixtureFor();
    await resolvers.npm('fixture-pkg', resolve, fixture.options);
    await resolvers.npm('fixture-pkg', resolve, { ...fixture.options, latestVersionCache: false,
      fetch: async () => { throw new Error('offline'); },
    });
    expect(await installedVersions(fixture)).toEqual(['1.10.0']);
  });

  test('skips invalid engine declarations without silently installing them', async () => {
    const metadata = enginePackument();
    metadata.versions['1.10.0'].engines.node = 'not-a-range';
    const fixture = await fixtureFor(metadata);
    await resolvers.npm('fixture-pkg', resolve, fixture.options);
    expect(await installedVersions(fixture)).toEqual(['1.2.0']);
  });

  test('supports per-call engine opt-out without changing later calls', async () => {
    const fixture = await fixtureFor();
    const fetch = async url => ({ ok: true, json: async () => url.endsWith('/latest')
      ? { version: '2.0.0' } : enginePackument() });
    const use = await makeUse({ ...fixture.options, fetch, specifierResolver: 'npm', pathResolver: resolve,
      import: async entry => JSON.parse(await readFile(path.join(path.dirname(entry), 'package.json'), 'utf8')),
    });
    expect((await use('fixture-pkg', { engineStrict: false })).version).toBe('2.0.0');
    expect((await use('fixture-pkg')).version).toBe('1.10.0');
  });

  test('supports the exported use function with per-call engine options', async () => {
    const fixture = await fixtureFor();
    const fetch = async url => ({ ok: true, json: async () => url.endsWith('/latest')
      ? { version: '2.0.0' } : enginePackument() });
    const loaded = await sharedUse('fixture-pkg', { ...fixture.options, fetch,
      specifierResolver: 'npm', engineStrict: false,
    });
    expect(loaded.version).toBe('2.0.0');
  });

  test('keeps diagnostics off by default', async () => {
    const fixture = await fixtureFor();
    await resolvers.npm('fixture-pkg', resolve, { ...fixture.options, debug: false });
    expect(fixture.messages).toEqual([]);
  });

  test('forwards makeUse options to npm resolution', async () => {
    const fixture = await fixtureFor();
    const use = await makeUse({ ...fixture.options, specifierResolver: 'npm', pathResolver: resolve,
      import: async entry => JSON.parse(await readFile(path.join(path.dirname(entry), 'package.json'), 'utf8')),
    });
    expect((await use('fixture-pkg')).version).toBe('1.10.0');
  });
});
