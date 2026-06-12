import { chmod, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { describe, test, expect, afterEach } from '../test-adapter.mjs';
import { resolvers } from 'use-m';

const moduleName = `[${import.meta.url.split('.').pop()} module]`;
const resolve = createRequire(import.meta.url).resolve;
const temporaryDirectories = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map(directory => rm(directory, { recursive: true, force: true })));
});

const createFakeNpm = async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'use-m-npm-prefix-'));
  temporaryDirectories.push(root);

  const binDirectory = path.join(root, 'bin');
  const defaultRoot = path.join(root, 'default-global', 'lib', 'node_modules');
  const home = path.join(root, 'home');
  const cache = path.join(root, 'cache');
  const logFile = path.join(root, 'npm.log');
  await mkdir(binDirectory, { recursive: true });
  await mkdir(defaultRoot, { recursive: true });
  await mkdir(home, { recursive: true });
  await mkdir(cache, { recursive: true });

  const npmPath = path.join(binDirectory, 'npm');
  await writeFile(npmPath, `#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');

const args = process.argv.slice(2);
const prefix = process.env.npm_config_prefix || process.env.NPM_CONFIG_PREFIX || '';
const root = prefix ? path.join(prefix, 'lib', 'node_modules') : process.env.USE_M_FAKE_NPM_DEFAULT_ROOT;
const logFile = process.env.USE_M_FAKE_NPM_LOG;

if (logFile) {
  fs.appendFileSync(logFile, JSON.stringify({ args, prefix, root }) + '\\n');
}

if (args[0] === 'root' && args[1] === '-g') {
  console.log(root);
  process.exit(0);
}

if (args[0] === 'show' && args[2] === 'version') {
  console.log(process.env.USE_M_FAKE_NPM_LATEST_VERSION || '1.0.0');
  process.exit(0);
}

if (args[0] === 'install' && args[1] === '-g' && args[2]) {
  const specifier = args[2];
  const alias = specifier.split('@npm:')[0];
  const requestedPackage = specifier.slice(specifier.indexOf('@npm:') + 5);
  const requestedVersion = requestedPackage.slice(requestedPackage.lastIndexOf('@') + 1);
  const installedVersion = requestedVersion === 'latest'
    ? process.env.USE_M_FAKE_NPM_LATEST_VERSION || '1.0.0'
    : requestedVersion;
  const packageDirectory = path.join(root, alias);

  fs.mkdirSync(packageDirectory, { recursive: true });
  fs.writeFileSync(
    path.join(packageDirectory, 'package.json'),
    JSON.stringify({ name: alias, version: installedVersion, main: 'index.js' })
  );
  fs.writeFileSync(path.join(packageDirectory, 'index.js'), 'module.exports = { installed: true };\\n');
  process.exit(0);
}

console.error('Unsupported fake npm command:', args.join(' '));
process.exit(1);
`);
  await chmod(npmPath, 0o755);

  const { npm_config_prefix, NPM_CONFIG_PREFIX, ...cleanProcessEnv } = process.env;
  const baseEnv = {
    ...cleanProcessEnv,
    PATH: `${binDirectory}${path.delimiter}${process.env.PATH || ''}`,
    HOME: home,
    XDG_CACHE_HOME: cache,
    USE_M_FAKE_NPM_DEFAULT_ROOT: defaultRoot,
    USE_M_FAKE_NPM_LOG: logFile,
    USE_M_FAKE_NPM_LATEST_VERSION: '1.0.0'
  };

  return { root, defaultRoot, cache, logFile, baseEnv };
};

const readNpmLog = async (logFile) => {
  const log = await readFile(logFile, 'utf8');
  return log.trim().split('\n').filter(Boolean).map(line => JSON.parse(line));
};

describe(`${moduleName} npm global prefix handling`, () => {
  test(`${moduleName} redirects installs to use-m cache when npm global root is not writable`, async () => {
    if (typeof Deno !== 'undefined' || typeof Bun !== 'undefined') {
      return;
    }

    const fixture = await createFakeNpm();
    const env = {
      ...fixture.baseEnv,
      USE_M_FAKE_NPM_DEFAULT_ROOT: '/sys/use-m-root/lib/node_modules'
    };

    const packagePath = await resolvers.npm('fixture-pkg@1.0.0', resolve, { env });
    const expectedPrefix = path.join(fixture.cache, 'use-m', 'npm-global');
    const expectedRoot = path.join(expectedPrefix, 'lib', 'node_modules');
    const npmCalls = await readNpmLog(fixture.logFile);
    const installCall = npmCalls.find(call => call.args[0] === 'install');

    expect(packagePath).toContain(path.join(expectedRoot, 'fixture-pkg-v-1.0.0'));
    expect(installCall.prefix).toBe(expectedPrefix);
    expect(installCall.root).toBe(expectedRoot);
  });

  test(`${moduleName} keeps the configured npm root when it is writable`, async () => {
    if (typeof Deno !== 'undefined' || typeof Bun !== 'undefined') {
      return;
    }

    const fixture = await createFakeNpm();
    const packagePath = await resolvers.npm('fixture-pkg@1.0.0', resolve, { env: fixture.baseEnv });
    const npmCalls = await readNpmLog(fixture.logFile);
    const installCall = npmCalls.find(call => call.args[0] === 'install');

    expect(packagePath).toContain(path.join(fixture.defaultRoot, 'fixture-pkg-v-1.0.0'));
    expect(installCall.prefix).toBe('');
    expect(installCall.root).toBe(fixture.defaultRoot);
  });

  test(`${moduleName} respects an explicit npm_config_prefix override`, async () => {
    if (typeof Deno !== 'undefined' || typeof Bun !== 'undefined') {
      return;
    }

    const fixture = await createFakeNpm();
    const customPrefix = path.join(fixture.root, 'custom-prefix');
    const customRoot = path.join(customPrefix, 'lib', 'node_modules');
    await mkdir(customRoot, { recursive: true });

    const env = {
      ...fixture.baseEnv,
      npm_config_prefix: customPrefix,
      USE_M_FAKE_NPM_DEFAULT_ROOT: '/sys/use-m-root/lib/node_modules'
    };
    const packagePath = await resolvers.npm('fixture-pkg@1.0.0', resolve, { env });
    const npmCalls = await readNpmLog(fixture.logFile);
    const installCall = npmCalls.find(call => call.args[0] === 'install');

    expect(packagePath).toContain(path.join(customRoot, 'fixture-pkg-v-1.0.0'));
    expect(installCall.prefix).toBe(customPrefix);
    expect(installCall.root).toBe(customRoot);
  });
});
