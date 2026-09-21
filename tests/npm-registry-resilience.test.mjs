import { chmod, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, test } from '../src/test-adapter.mjs';
import * as esmApi from '../src/use.mjs';

const require = createRequire(import.meta.url);
const cjsApi = require('../src/use.cjs');
const resolve = require.resolve;
const temporaryDirectories = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map(directory =>
    rm(directory, { recursive: true, force: true })
  ));
});

const response = (status, body = {}) => ({
  ok: status >= 200 && status < 300,
  status,
  statusText: status === 200 ? 'OK' : 'fixture failure',
  json: async () => body,
});

const createFixture = async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'use-m-registry-resilience-'));
  temporaryDirectories.push(root);
  const binDirectory = path.join(root, 'bin');
  const globalModulesPath = path.join(root, 'global', 'lib', 'node_modules');
  const metadataCache = path.join(root, 'metadata-cache');
  const logFile = path.join(root, 'npm.log');
  await mkdir(binDirectory, { recursive: true });
  await mkdir(globalModulesPath, { recursive: true });
  await writeFile(logFile, '');

  const npmPath = path.join(binDirectory, 'npm');
  await writeFile(npmPath, `#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');

const args = process.argv.slice(2);
const root = process.env.USE_M_FIXTURE_GLOBAL_ROOT;
fs.appendFileSync(process.env.USE_M_FIXTURE_LOG, JSON.stringify({
  args,
  registry: process.env.npm_config_registry || process.env.NPM_CONFIG_REGISTRY || null
}) + '\\n');

if (args[0] === 'root' && args[1] === '-g') {
  console.log(root);
  process.exit(0);
}
if (args[0] === 'config' && args[1] === 'get' && args[2] === 'registry') {
  if (process.env.USE_M_FIXTURE_CONFIG_FAILURE === '1') process.exit(1);
  console.log(process.env.USE_M_FIXTURE_REGISTRY || 'https://registry.npmjs.org/');
  process.exit(0);
}
if (args[0] === 'show' && args[2] === 'version') {
  if (process.env.USE_M_FIXTURE_SHOW_FAILURE === '1') {
    console.error('npm error code E403');
    console.error('npm error 403 forbidden');
    process.exit(1);
  }
  console.log(process.env.USE_M_FIXTURE_VERSION || '1.0.0');
  process.exit(0);
}

const specifier = args.find(arg => arg.includes('@npm:'));
if (args[0] === 'install' && args[1] === '-g' && specifier) {
  const alias = specifier.slice(0, specifier.indexOf('@npm:'));
  const requested = specifier.slice(specifier.indexOf('@npm:') + 5);
  const separator = requested.lastIndexOf('@');
  const packageName = requested.slice(0, separator);
  const requestedVersion = requested.slice(separator + 1);
  const version = requestedVersion === 'latest'
    ? process.env.USE_M_FIXTURE_VERSION || '1.0.0'
    : requestedVersion;
  const packageDirectory = path.join(root, alias);
  fs.mkdirSync(packageDirectory, { recursive: true });
  fs.writeFileSync(path.join(packageDirectory, 'package.json'), JSON.stringify({
    name: packageName,
    version,
    type: 'module',
    main: 'index.js'
  }));
  fs.writeFileSync(path.join(packageDirectory, 'index.js'),
    'export const packageName = ' + JSON.stringify(packageName) + ';\\n');
  process.exit(0);
}

console.error('Unsupported fixture npm command:', args.join(' '));
process.exit(1);
`);
  await chmod(npmPath, 0o755);

  const env = {
    ...process.env,
    PATH: `${binDirectory}${path.delimiter}${process.env.PATH || ''}`,
    HOME: path.join(root, 'home'),
    XDG_CACHE_HOME: path.join(root, 'xdg-cache'),
    USE_M_FIXTURE_GLOBAL_ROOT: globalModulesPath,
    USE_M_FIXTURE_LOG: logFile,
    USE_M_FIXTURE_VERSION: '1.0.0',
  };
  delete env.npm_config_registry;
  delete env.NPM_CONFIG_REGISTRY;

  return { env, globalModulesPath, logFile, metadataCache, root };
};

const resolverOptions = (fixture, overrides = {}) => ({
  env: fixture.env,
  installRetryDelayMs: 0,
  latestVersionCacheDirectory: fixture.metadataCache,
  registryRetryDelayMs: 0,
  ...overrides,
});

const readNpmLog = async (fixture) => (await readFile(fixture.logFile, 'utf8'))
  .trim()
  .split('\n')
  .filter(Boolean)
  .map(line => JSON.parse(line));

const writeInstalledPackage = async (fixture, packageName, version = '1.0.0') => {
  const alias = `${packageName.replace('@', '').replace('/', '-')}-v-latest`;
  const packageDirectory = path.join(fixture.globalModulesPath, alias);
  await mkdir(packageDirectory, { recursive: true });
  await writeFile(path.join(packageDirectory, 'package.json'), JSON.stringify({
    name: packageName,
    version,
    type: 'module',
    main: 'index.js',
  }));
  await writeFile(path.join(packageDirectory, 'index.js'), 'export const installed = true;\n');
  return packageDirectory;
};

for (const [format, api] of [['ESM', esmApi], ['CommonJS', cjsApi]]) {
  describe(`${format} npm registry metadata recovery`, () => {
    test('retries transient registry failures and caches a successful latest version', async () => {
      const fixture = await createFixture();
      fixture.env.USE_M_FIXTURE_VERSION = '2.0.0';
      const urls = [];
      let attempts = 0;
      const fetch = async url => {
        urls.push(url);
        attempts += 1;
        return attempts === 1
          ? response(403, { error: 'forbidden' })
          : response(200, { version: '2.0.0' });
      };
      const options = resolverOptions(fixture, {
        fetch,
        registry: 'https://registry.example.test/custom/',
        registryMaxAttempts: 3,
      });

      const first = await api.resolvers.npm('@scope/retry-fixture', resolve, options);
      const second = await api.resolvers.npm('@scope/retry-fixture', resolve, options);

      expect(first).toBe(second);
      expect(urls).toEqual([
        'https://registry.example.test/custom/%40scope%2Fretry-fixture/latest',
        'https://registry.example.test/custom/%40scope%2Fretry-fixture/latest',
      ]);
      const calls = await readNpmLog(fixture);
      expect(calls.filter(call => call.args[0] === 'show')).toHaveLength(0);
      const installCalls = calls.filter(call => call.args[0] === 'install');
      expect(installCalls).toHaveLength(1);
      expect(installCalls[0]).toMatchObject({
        args: ['install', '-g', 'scope-retry-fixture-v-latest@npm:@scope/retry-fixture@2.0.0'],
        registry: 'https://registry.example.test/custom/',
      });
    });

    test('does not retry non-transient registry responses before the npm CLI fallback', async () => {
      const fixture = await createFixture();
      let attempts = 0;
      await api.resolvers.npm('cli-fallback-fixture', resolve, resolverOptions(fixture, {
        fetch: async () => {
          attempts += 1;
          return response(401);
        },
        registry: 'https://registry.example.test/',
        registryMaxAttempts: 5,
      }));

      expect(attempts).toBe(1);
      const calls = await readNpmLog(fixture);
      expect(calls.filter(call => call.args[0] === 'show')).toHaveLength(1);
    });

    test('honors npm config registry discovery when no option or environment override exists', async () => {
      const fixture = await createFixture();
      fixture.env.USE_M_FIXTURE_REGISTRY = 'https://configured.example.test/team/';
      const urls = [];
      await api.resolvers.npm('configured-fixture', resolve, resolverOptions(fixture, {
        fetch: async url => {
          urls.push(url);
          return response(200, { version: '1.0.0' });
        },
      }));

      expect(urls).toEqual(['https://configured.example.test/team/configured-fixture/latest']);
      const calls = await readNpmLog(fixture);
      expect(calls.some(call => call.args.join(' ') === 'config get registry')).toBe(true);
    });

    test('prefers the npm registry environment setting without invoking npm config', async () => {
      const fixture = await createFixture();
      fixture.env.NPM_CONFIG_REGISTRY = 'https://environment.example.test/npm';
      const urls = [];
      await api.resolvers.npm('environment-fixture', resolve, resolverOptions(fixture, {
        fetch: async url => {
          urls.push(url);
          return response(200, { version: '1.0.0' });
        },
      }));

      expect(urls).toEqual(['https://environment.example.test/npm/environment-fixture/latest']);
      const calls = await readNpmLog(fixture);
      expect(calls.filter(call => call.args[0] === 'config')).toHaveLength(0);
    });

    test('never queries registry metadata for a pinned version', async () => {
      const fixture = await createFixture();
      let fetched = false;
      await api.resolvers.npm('pinned-fixture@4.5.6', resolve, resolverOptions(fixture, {
        fetch: async () => {
          fetched = true;
          throw new Error('pinned versions must not fetch metadata');
        },
      }));

      expect(fetched).toBe(false);
      const calls = await readNpmLog(fixture);
      expect(calls.filter(call => ['config', 'show'].includes(call.args[0]))).toHaveLength(0);
    });

    test('can disable latest-version caches explicitly', async () => {
      const fixture = await createFixture();
      let attempts = 0;
      const options = resolverOptions(fixture, {
        fetch: async () => {
          attempts += 1;
          return response(200, { version: '1.0.0' });
        },
        latestVersionCache: false,
        registry: 'https://registry.example.test/',
      });
      await api.resolvers.npm('uncached-fixture', resolve, options);
      await api.resolvers.npm('uncached-fixture', resolve, options);

      expect(attempts).toBe(2);
      await expect(readdir(fixture.metadataCache)).rejects.toHaveProperty('code', 'ENOENT');
    });

    test('times out registry requests and retries before using npm CLI', async () => {
      const fixture = await createFixture();
      let attempts = 0;
      const hangingFetch = async (_url, { signal }) => {
        attempts += 1;
        return new Promise((_resolve, reject) => {
          signal.addEventListener('abort', () => {
            const error = new Error('fixture request aborted');
            error.name = 'AbortError';
            reject(error);
          }, { once: true });
        });
      };
      await api.resolvers.npm('timeout-fixture', resolve, resolverOptions(fixture, {
        fetch: hangingFetch,
        registry: 'https://registry.example.test/',
        registryMaxAttempts: 2,
        registryRequestTimeoutMs: 5,
      }));

      expect(attempts).toBe(2);
      const calls = await readNpmLog(fixture);
      expect(calls.filter(call => call.args[0] === 'show')).toHaveLength(1);
    });

    test('falls back to an already-installed latest alias when metadata lookup is unavailable', async () => {
      const fixture = await createFixture();
      fixture.env.USE_M_FIXTURE_SHOW_FAILURE = '1';
      const installedDirectory = await writeInstalledPackage(fixture, 'installed-fallback-fixture', '7.8.9');
      const resolved = await api.resolvers.npm(
        'installed-fallback-fixture',
        resolve,
        resolverOptions(fixture, {
          fetch: async () => response(503),
          registry: 'https://registry.example.test/',
          registryMaxAttempts: 2,
        })
      );

      expect(resolved).toBe(path.join(installedDirectory, 'index.js'));
      const calls = await readNpmLog(fixture);
      expect(calls.filter(call => call.args[0] === 'install')).toHaveLength(0);
    });

    test('adds an actionable pinning hint when no latest-version fallback exists', async () => {
      const fixture = await createFixture();
      fixture.env.USE_M_FIXTURE_SHOW_FAILURE = '1';
      await expect(api.resolvers.npm(
        'missing-latest-fixture',
        resolve,
        resolverOptions(fixture, {
          fetch: async () => response(403),
          registry: 'https://registry.example.test/',
          registryCliFallback: false,
          registryMaxAttempts: 2,
        })
      )).rejects.toThrow("Pin a known version, for example 'missing-latest-fixture@1.2.3'");
      const calls = await readNpmLog(fixture);
      expect(calls.filter(call => call.args[0] === 'show')).toHaveLength(0);
    });

    test('emits detailed diagnostics only when debug logging is enabled', async () => {
      const fixture = await createFixture();
      const quietMessages = [];
      await api.resolvers.npm('quiet-debug-fixture', resolve, resolverOptions(fixture, {
        debugLogger: message => quietMessages.push(message),
        fetch: async () => response(200, { version: '1.0.0' }),
        registry: 'https://user:secret@registry.example.test/',
      }));
      expect(quietMessages).toEqual([]);

      const verboseMessages = [];
      let attempt = 0;
      fixture.env.USE_M_DEBUG = '2';
      await api.resolvers.npm('verbose-debug-fixture', resolve, resolverOptions(fixture, {
        debugLogger: message => verboseMessages.push(message),
        fetch: async () => {
          attempt += 1;
          return attempt === 1 ? response(429) : response(200, { version: '1.0.0' });
        },
        registry: 'https://user:secret@registry.example.test/',
      }));

      expect(verboseMessages.some(message => message.includes('registry attempt 1/3'))).toBe(true);
      expect(verboseMessages.some(message => message.includes('retrying'))).toBe(true);
      expect(verboseMessages.join('\n')).not.toContain('secret');
      expect(verboseMessages.every(message => message.startsWith('[use-m]'))).toBe(true);
      const cachedMetadata = await Promise.all((await readdir(fixture.metadataCache)).map(file =>
        readFile(path.join(fixture.metadataCache, file), 'utf8')
      ));
      expect(cachedMetadata.join('\n')).not.toContain('secret');
    });
  });
}

describe('npm latest-version disk cache', () => {
  test('is shared by the ESM and CommonJS implementations', async () => {
    const fixture = await createFixture();
    const options = resolverOptions(fixture, {
      fetch: async () => response(200, { version: '1.0.0' }),
      registry: 'https://registry.example.test/',
    });
    await esmApi.resolvers.npm('disk-cache-fixture', resolve, options);

    let fetched = false;
    await cjsApi.resolvers.npm('disk-cache-fixture', resolve, {
      ...options,
      fetch: async () => {
        fetched = true;
        throw new Error('fresh disk metadata should avoid a request');
      },
    });

    expect(fetched).toBe(false);
    const cacheFiles = await readdir(fixture.metadataCache);
    expect(cacheFiles).toHaveLength(1);
    const cached = JSON.parse(await readFile(path.join(fixture.metadataCache, cacheFiles[0]), 'utf8'));
    expect(cached).toMatchObject({
      packageName: 'disk-cache-fixture',
      registry: 'https://registry.example.test/',
      version: '1.0.0',
    });
  });

  test('uses stale disk metadata only after live registry and npm CLI lookups fail', async () => {
    const fixture = await createFixture();
    const initialOptions = resolverOptions(fixture, {
      fetch: async () => response(200, { version: '1.0.0' }),
      latestVersionCacheTtlMs: 1,
      registry: 'https://registry.example.test/',
    });
    await esmApi.resolvers.npm('stale-cache-fixture', resolve, initialOptions);
    await new Promise(resolveDelay => setTimeout(resolveDelay, 5));
    fixture.env.USE_M_FIXTURE_SHOW_FAILURE = '1';

    await expect(cjsApi.resolvers.npm('stale-cache-fixture', resolve, {
      ...initialOptions,
      fetch: async () => response(503),
      registryMaxAttempts: 2,
    })).resolves.toContain(path.join('stale-cache-fixture-v-latest', 'index.js'));

    const calls = await readNpmLog(fixture);
    expect(calls.filter(call => call.args[0] === 'show')).toHaveLength(1);
    expect(calls.filter(call => call.args[0] === 'install')).toHaveLength(1);
  });
});
