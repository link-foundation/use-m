import { createRequire } from 'node:module';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import { describe, test, expect, afterEach } from '../src/test-adapter.mjs';
import { makeUse, resolvers, use as sharedUse } from 'use-m';
import fixtures from './fixtures/npm-engines.cjs';
const { createEngineFixture, enginePackument } = fixtures;
const require = createRequire(import.meta.url);
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
const installs = async fixture => (await fixture.calls())
  .filter(args => args[0] === 'install').map(args => args.find(arg => arg.includes('@npm:')));
const installedVersions = async fixture => (await installs(fixture)).map(spec => spec.split('@').pop());
const installedAliases = async fixture => (await installs(fixture)).map(spec => spec.split('@npm:')[0]);
const offline = async () => { throw new Error('offline'); };
const writeAlias = async (fixture, alias, manifest) => {
  const directory = path.join(fixture.modules, alias);
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, 'package.json'), JSON.stringify({ type: 'commonjs', main: 'index.js', ...manifest }));
  await writeFile(path.join(directory, 'index.js'), `module.exports = ${JSON.stringify({ version: manifest.version })};`);
  return path.join(directory, 'index.js');
};

describe('Node engine compatible npm resolution', () => {
  for (const selector of ['', '@latest']) {
    test(`installs the newest compatible release under its exact alias for ${selector || 'implicit latest'}`, async () => {
      const fixture = await fixtureFor();
      await resolvers.npm(`fixture-pkg${selector}`, resolve, fixture.options);
      expect(await installedVersions(fixture)).toEqual(['1.10.0']);
      expect(await installedAliases(fixture)).toEqual(['fixture-pkg-v-1.10.0']);
    });
  }

  for (const selector of ['@*', '@>=1 <3', '@^1.0.0', '@1.x', '@~1.10.0', '@1.0.0 - 2.0.0', '@^1 || ^2']) {
    test(`selects the newest compatible stable release for the range ${selector}`, async () => {
      const fixture = await fixtureFor();
      await resolvers.npm(`fixture-pkg${selector}`, resolve, fixture.options);
      expect(await installedVersions(fixture)).toEqual(['1.10.0']);
    });
  }

  test('keeps the previous requests and alias when latest supports the running Node', async () => {
    const metadata = enginePackument();
    metadata.versions['2.0.0'].engines.node = '>=18';
    const fixture = await fixtureFor(metadata);
    await resolvers.npm('fixture-pkg', resolve, fixture.options);
    expect(await installedVersions(fixture)).toEqual(['2.0.0']);
    expect(await installedAliases(fixture)).toEqual(['fixture-pkg-v-latest']);
    expect(fixture.fetched).toEqual([`${fixture.options.registry}fixture-pkg/latest`]);
  });

  test('keeps legacy range aliases for ranges that installed before', async () => {
    const fixture = await fixtureFor();
    await resolvers.npm('fixture-pkg@^1.0.0', resolve, fixture.options);
    await resolvers.npm('fixture-pkg@1.x', resolve, fixture.options);
    expect(await installedAliases(fixture)).toEqual(['fixture-pkg-v-^1.0.0', 'fixture-pkg-v-1.x']);
  });

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

  test('never moves latest past the latest dist-tag', async () => {
    const metadata = enginePackument();
    metadata.versions['2.1.0'] = { version: '2.1.0', engines: { node: '>=18' } };
    const fixture = await fixtureFor(metadata);
    await resolvers.npm('fixture-pkg', resolve, fixture.options);
    expect(await installedVersions(fixture)).toEqual(['1.10.0']);
  });

  test('keeps npm\'s range choice by default when no release in it is compatible', async () => {
    const fixture = await fixtureFor();
    await resolvers.npm('fixture-pkg@^2', resolve, fixture.options);
    expect(await installedVersions(fixture)).toEqual(['^2']);
    expect(fixture.messages.join('\n')).toMatch(/No release of fixture-pkg@\^2 is compatible.*requires Node >=999/);
  });

  test('fails before install with engineStrict when a range has no compatible release', async () => {
    const fixture = await fixtureFor();
    await expect(resolvers.npm('fixture-pkg@^2', resolve, { ...fixture.options, engineStrict: true }))
      .rejects.toThrow(/fixture-pkg@\^2.*Node.*999.*Pin a version or upgrade Node/);
    expect(await installedVersions(fixture)).toEqual([]);
  });

  test('keeps the previous latest install by default when no release is compatible', async () => {
    const metadata = enginePackument();
    delete metadata.versions['1.2.0'];
    delete metadata.versions['1.10.0'];
    const fixture = await fixtureFor(metadata);
    await resolvers.npm('fixture-pkg', resolve, fixture.options);
    expect(await installedVersions(fixture)).toEqual(['2.0.0']);
    expect(await installedAliases(fixture)).toEqual(['fixture-pkg-v-latest']);
  });

  test('fails fast with engineStrict when no release supports the running Node', async () => {
    const metadata = enginePackument();
    delete metadata.versions['1.2.0'];
    delete metadata.versions['1.10.0'];
    const fixture = await fixtureFor(metadata);
    const error = await resolvers.npm('fixture-pkg', resolve, { ...fixture.options, engineStrict: true })
      .catch(caught => caught);
    expect(error.code).toBe('USE_M_UNSUPPORTED_NODE');
    expect(error.message).toMatch(/fixture-pkg@2\.0\.0 requires Node >=999.*pin a version or upgrade Node/i);
    expect(await installedVersions(fixture)).toEqual([]);
  });

  test('logs the rejected latest version and chosen fallback', async () => {
    const fixture = await fixtureFor();
    await resolvers.npm('fixture-pkg', resolve, fixture.options);
    expect(fixture.messages.join('\n')).toMatch(/fixture-pkg@latest is 2\.0\.0 \(engines node >=999\).*using 1\.10\.0.*Node/);
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
    await resolvers.npm('fixture-pkg', resolve, { ...fixture.options, registryCliFallback: true, fetch: offline });
    expect(await installedVersions(fixture)).toEqual(['1.10.0']);
    const commands = (await fixture.calls()).map(args => args[0]);
    expect(commands).toContain('show');
    expect(commands).toContain('view');
  });

  test('accepts npm view output listing plain version strings', async () => {
    const fixture = await fixtureFor();
    fixture.options.env.USE_M_ENGINE_VIEW = JSON.stringify(['1.2.0', '1.10.0']);
    await resolvers.npm('fixture-pkg', resolve, { ...fixture.options, registryCliFallback: true, fetch: offline });
    expect(await installedVersions(fixture)).toEqual(['1.10.0']);
  });

  test('supports an opt-out per instance and does not contaminate engine-aware caches', async () => {
    const fixture = await fixtureFor();
    await resolvers.npm('fixture-pkg', resolve, { ...fixture.options, engineStrict: false });
    await resolvers.npm('fixture-pkg', resolve, fixture.options);
    expect(await installedVersions(fixture)).toEqual(['2.0.0', '1.10.0']);
  });

  test('supports an environment opt-out and an explicit option override', async () => {
    const fixture = await fixtureFor();
    fixture.options.env.USE_M_ENGINE_STRICT = 'false';
    await resolvers.npm('fixture-pkg', resolve, fixture.options);
    await resolvers.npm('fixture-pkg', resolve, { ...fixture.options, engineStrict: true });
    expect(await installedVersions(fixture)).toEqual(['2.0.0', '1.10.0']);
  });

  test('supports an environment strict mode', async () => {
    const fixture = await fixtureFor();
    fixture.options.env.USE_M_ENGINE_STRICT = '1';
    await expect(resolvers.npm('fixture-pkg@^2', resolve, fixture.options)).rejects.toThrow(/USE_M_ENGINE_STRICT/);
    expect(await installedVersions(fixture)).toEqual([]);
  });

  test('keeps exact pins and named tags explicit without metadata lookup', async () => {
    const fixture = await fixtureFor();
    await resolvers.npm('fixture-pkg@2.0.0', resolve, { ...fixture.options, fetch: offline });
    await resolvers.npm('fixture-pkg@next', resolve, { ...fixture.options, fetch: offline });
    expect(await installedVersions(fixture)).toEqual(['2.0.0', 'next']);
    expect(fixture.fetched).toEqual([]);
  });

  test('isolates cache decisions across Node upgrades in the reported command-stream incident', async () => {
    const metadata = { 'dist-tags': { latest: '2.0.0' }, versions: {
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
      expect(await installedAliases(fixture)).toEqual(['command-stream-v-1.6.2', 'command-stream-v-latest']);
    } finally {
      Object.defineProperty(process.versions, 'node', descriptor);
    }
  });

  test('keeps range caches separate and reuses installed ranges without lookups', async () => {
    const fixture = await fixtureFor();
    await resolvers.npm('fixture-pkg@^1', resolve, fixture.options);
    await resolvers.npm('fixture-pkg@~1.2', resolve, fixture.options);
    expect(await installedVersions(fixture)).toEqual(['1.10.0', '1.2.0']);
    expect((await readdir(path.join(fixture.root, 'cache'))).length).toBe(2);
    await resolvers.npm('fixture-pkg@^1', resolve, { ...fixture.options, latestVersionCache: false, fetch: offline });
    expect(await installedVersions(fixture)).toEqual(['1.10.0', '1.2.0']);
  });

  test('uses stale compatible metadata during an outage', async () => {
    const fixture = await fixtureFor();
    await resolvers.npm('fixture-pkg', resolve, fixture.options);
    await new Promise(done => setTimeout(done, 5));
    await resolvers.npm('fixture-pkg', resolve, { ...fixture.options, latestVersionCacheTtlMs: 0, fetch: offline });
    expect(await installedVersions(fixture)).toEqual(['1.10.0']);
    expect(fixture.messages.join('\n')).toContain('stale cached Node-compatible selection');
  });

  test('chooses the highest compatible installed exact version during an outage', async () => {
    const fixture = await fixtureFor();
    await writeAlias(fixture, 'fixture-pkg-v-latest', { name: 'fixture-pkg', version: '2.0.0', engines: { node: '>=999' } });
    await writeAlias(fixture, 'fixture-pkg-v-1.2.0', { name: 'fixture-pkg', version: '1.2.0', engines: { node: '>=18' } });
    const expected = await writeAlias(fixture, 'fixture-pkg-v-1.10.0', { name: 'fixture-pkg', version: '1.10.0', engines: { node: '>=18' } });
    expect(await resolvers.npm('fixture-pkg', resolve, { ...fixture.options, latestVersionCache: false, fetch: offline }))
      .toBe(expected);
    expect(await installedVersions(fixture)).toEqual([]);
  });

  test('keeps an incompatible installed alias usable offline unless engineStrict is set', async () => {
    const fixture = await fixtureFor();
    const entry = await writeAlias(fixture, 'fixture-pkg-v-latest', { version: '2.0.0', engines: { node: '>=999' } });
    const options = { ...fixture.options, latestVersionCache: false, fetch: offline };
    await expect(resolvers.npm('fixture-pkg', resolve, { ...options, engineStrict: true }))
      .rejects.toThrow(/compatible with Node/);
    expect(await resolvers.npm('fixture-pkg', resolve, options)).toBe(entry);
    expect(await installedVersions(fixture)).toEqual([]);
  });

  test('adopts a compatible legacy moving alias during an outage', async () => {
    const fixture = await fixtureFor();
    const entry = await writeAlias(fixture, 'fixture-pkg-v-latest', { version: '1.10.0', engines: { node: '>=18' } });
    expect(await resolvers.npm('fixture-pkg', resolve, { ...fixture.options, fetch: offline })).toBe(entry);
    expect(await installedVersions(fixture)).toEqual([]);
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
    const use = await makeUse({ ...fixture.options, specifierResolver: 'npm', pathResolver: resolve,
      import: async entry => JSON.parse(await readFile(path.join(path.dirname(entry), 'package.json'), 'utf8')),
    });
    expect((await use('fixture-pkg', { engineStrict: false })).version).toBe('2.0.0');
    expect((await use('fixture-pkg')).version).toBe('1.10.0');
  });

  test('supports the exported use function with per-call engine options', async () => {
    const fixture = await fixtureFor();
    const loaded = await sharedUse('fixture-pkg', { ...fixture.options, specifierResolver: 'npm', engineStrict: false });
    expect(loaded.version).toBe('2.0.0');
  });

  test('imports the compatible replacement after an unchecked module was already loaded', async () => {
    const fixture = await fixtureFor();
    const use = await makeUse({ ...fixture.options, specifierResolver: 'npm', pathResolver: resolve });
    expect((await use('fixture-pkg', { engineStrict: false })).version).toBe('2.0.0');
    expect((await use('fixture-pkg')).version).toBe('1.10.0');
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

  test('does not leak the embedded semver helper into evaluating scripts', async () => {
    const source = await readFile(new URL('../use.js', import.meta.url), 'utf8');
    const context = vm.createContext({});
    vm.runInContext(source, context);
    expect(Object.prototype.hasOwnProperty.call(context, 'npmSemver')).toBe(false);
  });
});
