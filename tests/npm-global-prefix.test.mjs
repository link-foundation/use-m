import { chmod, mkdir, mkdtemp, readFile, readlink, rm, symlink, utimes, writeFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { promisify } from 'node:util';
import { describe, test, expect, afterEach } from '../src/test-adapter.mjs';
import { makeUse, resolvers } from 'use-m';

const moduleName = `[${import.meta.url.split('.').pop()} module]`;
const resolve = createRequire(import.meta.url).resolve;
const execFileAsync = promisify(execFile);
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
  if (process.env.USE_M_FAKE_NPM_EMPTY_ROOT === '1') process.exit(0);
  if (prefix && process.env.USE_M_FAKE_NPM_PREFIX_ROOT_FAILURE === '1') process.exit(1);
  console.log(root);
  process.exit(0);
}

if (args[0] === 'show' && args[2] === 'version') {
  console.log(process.env.USE_M_FAKE_NPM_LATEST_VERSION || '1.0.0');
  process.exit(0);
}

const installSpecifier = args.find(arg => arg.includes('@npm:'));
if (args[0] === 'install' && args[1] === '-g' && installSpecifier) {
  const specifier = installSpecifier;
  const alias = specifier.split('@npm:')[0];
  const requestedPackage = specifier.slice(specifier.indexOf('@npm:') + 5);
  const versionSeparator = requestedPackage.lastIndexOf('@');
  const requestedName = requestedPackage.slice(0, versionSeparator);
  const requestedVersion = requestedPackage.slice(versionSeparator + 1);
  const installedVersion = requestedVersion === 'latest'
    ? process.env.USE_M_FAKE_NPM_LATEST_VERSION || '1.0.0'
    : requestedVersion;
  const packageDirectory = path.join(root, alias);
  const binName = process.env.USE_M_FAKE_NPM_BIN_NAME;
  const binPath = binName ? path.resolve(root, '..', '..', 'bin', binName) : null;
  const installAttempt = fs.readFileSync(logFile, 'utf8')
    .trim()
    .split('\\n')
    .filter(Boolean)
    .map(line => JSON.parse(line))
    .filter(call => call.args[0] === 'install')
    .length;
  const failuresBeforeSuccess = Number(process.env.USE_M_FAKE_NPM_INSTALL_FAILURES || 0);

  // npm 11 checks an existing global executable even with --no-bin-links.
  // Only --force gets past the collision, after which --no-bin-links keeps the
  // existing executable untouched.
  if (binPath && fs.existsSync(binPath) && !args.includes('--force')) {
    console.error('npm error code EEXIST');
    console.error('npm error path ' + binPath);
    console.error('npm error EEXIST: file already exists');
    console.error('npm error File exists: ' + binPath);
    process.exit(1);
  }

  if (installAttempt <= failuresBeforeSuccess) {
    fs.mkdirSync(packageDirectory, { recursive: true });
    fs.writeFileSync(path.join(packageDirectory, 'partial-install'), 'incomplete');
    console.log('fake npm stdout: attempt ' + installAttempt);
    console.error('fake npm stderr: registry unavailable on attempt ' + installAttempt);
    process.exit(1);
  }

  fs.mkdirSync(packageDirectory, { recursive: true });
  fs.writeFileSync(
    path.join(packageDirectory, 'package.json'),
    JSON.stringify({ name: requestedName, version: installedVersion, type: 'module', main: 'index.js' })
  );

  // Real npm writes package.json before the rest of the tree is extracted, so
  // this delay reproduces the window in which the alias directory already
  // declares its final version but cannot be imported yet. The sentinel records
  // whether a second npm run entered that window at the same time.
  const installDelayMs = Number(process.env.USE_M_FAKE_NPM_INSTALL_DELAY_MS || 0);
  if (installDelayMs > 0) {
    const sentinel = path.join(root, '.fake-npm-install-active');
    let holdsSentinel = false;
    try {
      fs.writeFileSync(sentinel, String(process.pid), { flag: 'wx' });
      holdsSentinel = true;
    } catch {
      fs.appendFileSync(logFile, JSON.stringify({ args: ['overlap'], prefix, root }) + '\\n');
    }
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, installDelayMs);
    if (holdsSentinel) {
      fs.rmSync(sentinel, { force: true });
    }
  }

  fs.writeFileSync(
    path.join(packageDirectory, 'index.js'),
    'export const installed = true; export const installAttempt = ' + installAttempt + ';\\n'
  );
  if (binPath && !args.includes('--no-bin-links')) {
    fs.mkdirSync(path.dirname(binPath), { recursive: true });
    fs.symlinkSync(path.relative(path.dirname(binPath), path.join(packageDirectory, 'index.js')), binPath);
  }
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

const corruptAlias = async (fixture, { packageJson, source }) => {
  const packageDirectory = path.join(fixture.defaultRoot, 'fixture-pkg-v-1.0.0');
  await mkdir(packageDirectory, { recursive: true });
  await writeFile(path.join(packageDirectory, 'package.json'), packageJson);
  if (source !== undefined) {
    await writeFile(path.join(packageDirectory, 'index.js'), source);
  }
  return packageDirectory;
};

const useFixturePackageInFreshProcess = async (fixture) => {
  const useModuleUrl = new URL('../src/use.mjs', import.meta.url).href;
  const packageEntryPath = path.join(fixture.defaultRoot, 'fixture-pkg-v-1.0.0', 'index.js');
  const source = `
    import { makeUse } from ${JSON.stringify(useModuleUrl)};
    import { readFile } from 'node:fs/promises';
    try {
      const use = await makeUse();
      const loaded = await use('fixture-pkg@1.0.0');
      process.stdout.write(JSON.stringify(loaded));
    } catch (error) {
      console.error(error);
      console.error('entry after recovery:', await readFile(${JSON.stringify(packageEntryPath)}, 'utf8'));
      console.error('npm calls:', await readFile(${JSON.stringify(fixture.logFile)}, 'utf8'));
      process.exitCode = 1;
    }
  `;
  const { stdout } = await execFileAsync(
    process.execPath,
    ['--input-type=module', '--eval', source],
    { env: fixture.baseEnv }
  );
  return JSON.parse(stdout);
};

const failFixtureImportInFreshProcess = async (fixture) => {
  const useModuleUrl = new URL('../src/use.mjs', import.meta.url).href;
  const source = `
    import { makeUse } from ${JSON.stringify(useModuleUrl)};
    const use = await makeUse({
      import: async () => {
        const error = new Error('application-level missing import');
        error.code = 'ERR_MODULE_NOT_FOUND';
        throw error;
      }
    });
    try {
      await use('fixture-pkg@1.0.0');
    } catch (error) {
      process.stdout.write(JSON.stringify({ message: error.message, code: error.code }));
    }
  `;
  const { stdout } = await execFileAsync(
    process.execPath,
    ['--input-type=module', '--eval', source],
    { env: fixture.baseEnv }
  );
  return JSON.parse(stdout);
};

const repairFixtureWithRmRetryProbeInFreshProcess = async (fixture) => {
  const useModuleUrl = new URL('../src/use.mjs', import.meta.url).href;
  const source = `
    import { createRequire, syncBuiltinESMExports } from 'node:module';
    const require = createRequire(import.meta.url);
    const fsPromises = require('node:fs/promises');
    const originalRm = fsPromises.rm;
    const cleanupCalls = [];
    fsPromises.rm = async (target, options) => {
      cleanupCalls.push({ target, options });
      if (options?.maxRetries !== 5 || options?.retryDelay !== 100) {
        const error = new Error("ENOTEMPTY: directory not empty, rmdir '" + target + "'");
        error.code = 'ENOTEMPTY';
        throw error;
      }
      return originalRm(target, options);
    };
    syncBuiltinESMExports();

    const { resolvers } = await import(${JSON.stringify(useModuleUrl)});
    const packagePath = await resolvers.npm(
      'fixture-pkg@1.0.0',
      require.resolve,
      { env: process.env, repair: true, installRetryDelayMs: 0 }
    );
    const installedSource = await fsPromises.readFile(packagePath, 'utf8');
    process.stdout.write(JSON.stringify({ cleanupCalls, installedSource }));
  `;
  const { stdout } = await execFileAsync(
    process.execPath,
    ['--input-type=module', '--eval', source],
    { env: fixture.baseEnv }
  );
  return JSON.parse(stdout);
};

const installFixtureInFreshProcesses = async (fixture, count, env) => {
  const useModuleUrl = new URL('../src/use.mjs', import.meta.url).href;
  const source = `
    import { createRequire } from 'node:module';
    import { readFile } from 'node:fs/promises';
    const require = createRequire(import.meta.url);
    const { resolvers } = await import(${JSON.stringify(useModuleUrl)});
    const packagePath = await resolvers.npm(
      'fixture-pkg@1.0.0',
      require.resolve,
      { env: process.env, installRetryDelayMs: 0 }
    );
    process.stdout.write(JSON.stringify({ packagePath, source: await readFile(packagePath, 'utf8') }));
  `;
  return Promise.all(Array.from({ length: count }, async () => {
    try {
      const { stdout } = await execFileAsync(
        process.execPath,
        ['--input-type=module', '--eval', source],
        { env }
      );
      return JSON.parse(stdout);
    } catch (error) {
      return { error: error.stderr || error.message };
    }
  }));
};

describe(`${moduleName} npm global prefix handling`, () => {
  test(`${moduleName} keeps latest and pinned aliases loadable when they share a package binary`, async () => {
    if (typeof Deno !== 'undefined' || typeof Bun !== 'undefined') {
      return;
    }

    const fixture = await createFakeNpm();
    const env = {
      ...fixture.baseEnv,
      USE_M_FAKE_NPM_BIN_NAME: 'fixture-cli'
    };
    const binPath = path.resolve(fixture.defaultRoot, '..', '..', 'bin', 'fixture-cli');
    const latestPath = await resolvers.npm('fixture-pkg', resolve, { env, installRetryDelayMs: 0 });
    const originalBinTarget = await readlink(binPath);
    const pinnedPath = await resolvers.npm('fixture-pkg@1.0.0', resolve, { env, installRetryDelayMs: 0 });
    const npmCalls = await readNpmLog(fixture.logFile);
    const installCalls = npmCalls.filter(call => call.args[0] === 'install');

    expect(await readFile(latestPath, 'utf8')).toContain('installed = true');
    expect(await readFile(pinnedPath, 'utf8')).toContain('installed = true');
    expect(await readlink(binPath)).toBe(originalBinTarget);
    expect(installCalls).toHaveLength(3);
    expect(installCalls[2].args).toEqual([
      'install',
      '-g',
      '--force',
      '--no-bin-links',
      'fixture-pkg-v-1.0.0@npm:fixture-pkg@1.0.0'
    ]);
  });

  test(`${moduleName} never force-installs over an unrelated global executable`, async () => {
    if (typeof Deno !== 'undefined' || typeof Bun !== 'undefined') {
      return;
    }

    const fixture = await createFakeNpm();
    const env = {
      ...fixture.baseEnv,
      USE_M_FAKE_NPM_BIN_NAME: 'fixture-cli'
    };
    const unrelatedDirectory = path.join(fixture.defaultRoot, 'unrelated-pkg');
    const unrelatedEntry = path.join(unrelatedDirectory, 'index.js');
    const binPath = path.resolve(fixture.defaultRoot, '..', '..', 'bin', 'fixture-cli');
    await mkdir(unrelatedDirectory, { recursive: true });
    await writeFile(unrelatedEntry, 'user installed executable\n');
    await mkdir(path.dirname(binPath), { recursive: true });
    await symlink(path.relative(path.dirname(binPath), unrelatedEntry), binPath);
    const originalBinTarget = await readlink(binPath);

    await expect(resolvers.npm(
      'fixture-pkg@1.0.0',
      resolve,
      { env, installRetryDelayMs: 0 }
    )).rejects.toThrow('EEXIST');
    const npmCalls = await readNpmLog(fixture.logFile);
    const installCalls = npmCalls.filter(call => call.args[0] === 'install');

    expect(installCalls).toHaveLength(3);
    expect(installCalls.some(call => call.args.includes('--force'))).toBe(false);
    expect(await readlink(binPath)).toBe(originalBinTarget);
    expect(await readFile(unrelatedEntry, 'utf8')).toBe('user installed executable\n');
  });

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
    const reusedPackagePath = await resolvers.npm('fixture-pkg@1.0.0', resolve, { env });
    const expectedPrefix = path.join(fixture.cache, 'use-m', 'npm-global');
    const expectedRoot = path.join(expectedPrefix, 'lib', 'node_modules');
    const npmCalls = await readNpmLog(fixture.logFile);
    const installCall = npmCalls.find(call => call.args[0] === 'install');

    expect(packagePath).toContain(path.join(expectedRoot, 'fixture-pkg-v-1.0.0'));
    expect(reusedPackagePath).toBe(packagePath);
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

  test(`${moduleName} retries transient npm install failures and removes partial aliases`, async () => {
    if (typeof Deno !== 'undefined' || typeof Bun !== 'undefined') {
      return;
    }

    const fixture = await createFakeNpm();
    const env = {
      ...fixture.baseEnv,
      USE_M_FAKE_NPM_INSTALL_FAILURES: '2'
    };
    const packagePath = await resolvers.npm(
      'fixture-pkg@1.0.0',
      resolve,
      { env, installRetryDelayMs: 0 }
    );
    const npmCalls = await readNpmLog(fixture.logFile);
    const installCalls = npmCalls.filter(call => call.args[0] === 'install');

    expect(installCalls).toHaveLength(3);
    expect(await readFile(packagePath, 'utf8')).toContain('installAttempt = 3');
  });

  test(`${moduleName} reports captured npm output and cleans up after exhausted retries`, async () => {
    if (typeof Deno !== 'undefined' || typeof Bun !== 'undefined') {
      return;
    }

    const fixture = await createFakeNpm();
    const env = {
      ...fixture.baseEnv,
      USE_M_FAKE_NPM_INSTALL_FAILURES: '3'
    };
    let thrown;
    try {
      await resolvers.npm(
        'fixture-pkg@1.0.0',
        resolve,
        { env, installRetryDelayMs: 0 }
      );
    } catch (error) {
      thrown = error;
    }
    const npmCalls = await readNpmLog(fixture.logFile);
    const installCalls = npmCalls.filter(call => call.args[0] === 'install');
    const packageDirectory = path.join(fixture.defaultRoot, 'fixture-pkg-v-1.0.0');

    expect(installCalls).toHaveLength(3);
    expect(thrown.message).toContain('fake npm stderr: registry unavailable on attempt 3');
    expect(thrown.message).toContain('fake npm stdout: attempt 3');
    await expect(readFile(path.join(packageDirectory, 'partial-install'), 'utf8')).rejects.toThrow();
  });

  test(`${moduleName} gives corrupt-alias cleanup a recursive rm retry budget`, async () => {
    if (typeof Deno !== 'undefined' || typeof Bun !== 'undefined') {
      return;
    }

    const fixture = await createFakeNpm();
    const packageDirectory = await corruptAlias(fixture, {
      packageJson: JSON.stringify({ name: 'fixture-pkg', version: '1.0.0', type: 'module', main: 'index.js' }),
      source: 'export const stale = true;\n'
    });
    const result = await repairFixtureWithRmRetryProbeInFreshProcess(fixture);

    expect(result.cleanupCalls).toEqual([{
      target: packageDirectory,
      options: {
        recursive: true,
        force: true,
        maxRetries: 5,
        retryDelay: 100
      }
    }]);
    expect(result.installedSource).toContain('installed = true');
  });

  test(`${moduleName} repairs a truncated entry point and bypasses the cached syntax failure`, async () => {
    if (typeof Deno !== 'undefined' || typeof Bun !== 'undefined') {
      return;
    }

    const fixture = await createFakeNpm();
    await corruptAlias(fixture, {
      packageJson: JSON.stringify({ name: 'fixture-pkg', version: '1.0.0', type: 'module', main: 'index.js' }),
      source: 'export const value = ('
    });

    const loaded = await useFixturePackageInFreshProcess(fixture);
    const npmCalls = await readNpmLog(fixture.logFile);

    expect(loaded.installed).toBe(true);
    expect(npmCalls.filter(call => call.args[0] === 'install')).toHaveLength(1);
  });

  test(`${moduleName} repairs an alias missing an internal ESM dependency`, async () => {
    if (typeof Deno !== 'undefined' || typeof Bun !== 'undefined') {
      return;
    }

    const fixture = await createFakeNpm();
    await corruptAlias(fixture, {
      packageJson: JSON.stringify({ name: 'fixture-pkg', version: '1.0.0', type: 'module', main: 'index.js' }),
      source: "export { value } from './missing-internal.mjs';\n"
    });

    const loaded = await useFixturePackageInFreshProcess(fixture);
    const npmCalls = await readNpmLog(fixture.logFile);

    expect(loaded.installed).toBe(true);
    expect(npmCalls.filter(call => call.args[0] === 'install')).toHaveLength(1);
  });

  test(`${moduleName} repairs an alias with invalid package metadata`, async () => {
    if (typeof Deno !== 'undefined' || typeof Bun !== 'undefined') {
      return;
    }

    const fixture = await createFakeNpm();
    await corruptAlias(fixture, {
      packageJson: '{"name":"fixture-pkg","version":"1.0.0",',
      source: 'module.exports = { stale: true };\n'
    });

    const loaded = await useFixturePackageInFreshProcess(fixture);
    const npmCalls = await readNpmLog(fixture.logFile);

    expect(loaded.installed).toBe(true);
    expect(npmCalls.filter(call => call.args[0] === 'install')).toHaveLength(1);
  });

  test(`${moduleName} repairs an alias whose declared entry point is missing`, async () => {
    if (typeof Deno !== 'undefined' || typeof Bun !== 'undefined') {
      return;
    }

    const fixture = await createFakeNpm();
    await corruptAlias(fixture, {
      packageJson: JSON.stringify({ name: 'fixture-pkg', version: '1.0.0', main: 'missing.js' })
    });

    const loaded = await useFixturePackageInFreshProcess(fixture);
    const npmCalls = await readNpmLog(fixture.logFile);

    expect(loaded.installed).toBe(true);
    expect(npmCalls.filter(call => call.args[0] === 'install')).toHaveLength(1);
  });

  test(`${moduleName} does not reinstall for an unrelated unwrapped missing-module error`, async () => {
    if (typeof Deno !== 'undefined' || typeof Bun !== 'undefined') {
      return;
    }

    const fixture = await createFakeNpm();
    const thrown = await failFixtureImportInFreshProcess(fixture);
    const npmCalls = await readNpmLog(fixture.logFile);

    expect(thrown).toEqual({
      message: 'application-level missing import',
      code: 'ERR_MODULE_NOT_FOUND'
    });
    expect(npmCalls.filter(call => call.args[0] === 'install')).toHaveLength(1);
  });

  test(`${moduleName} collapses concurrent requests for one package into a single install`, async () => {
    if (typeof Deno !== 'undefined' || typeof Bun !== 'undefined') {
      return;
    }

    const fixture = await createFakeNpm();
    const env = {
      ...fixture.baseEnv,
      USE_M_FAKE_NPM_INSTALL_DELAY_MS: '250'
    };
    const packagePaths = await Promise.all(Array.from({ length: 8 }, () => resolvers.npm(
      'fixture-pkg@1.0.0',
      resolve,
      { env, installRetryDelayMs: 0 }
    )));
    const npmCalls = await readNpmLog(fixture.logFile);

    expect(npmCalls.filter(call => call.args[0] === 'install')).toHaveLength(1);
    expect(new Set(packagePaths).size).toBe(1);
    expect(await readFile(packagePaths[0], 'utf8')).toContain('installed = true');
  }, 30000);

  test(`${moduleName} keeps a shared failed install retryable`, async () => {
    if (typeof Deno !== 'undefined' || typeof Bun !== 'undefined') {
      return;
    }

    const fixture = await createFakeNpm();
    const env = {
      ...fixture.baseEnv,
      USE_M_FAKE_NPM_INSTALL_FAILURES: '3'
    };
    const settled = await Promise.allSettled(Array.from({ length: 3 }, () => resolvers.npm(
      'fixture-pkg@1.0.0',
      resolve,
      { env, installRetryDelayMs: 0 }
    )));
    const npmCallsAfterFailure = await readNpmLog(fixture.logFile);
    const packagePath = await resolvers.npm(
      'fixture-pkg@1.0.0',
      resolve,
      { env, installRetryDelayMs: 0 }
    );

    expect(settled.map(result => result.status)).toEqual(['rejected', 'rejected', 'rejected']);
    expect(npmCallsAfterFailure.filter(call => call.args[0] === 'install')).toHaveLength(3);
    expect(await readFile(packagePath, 'utf8')).toContain('installed = true');
  }, 30000);

  test(`${moduleName} never lets separate processes install one alias at the same time`, async () => {
    if (typeof Deno !== 'undefined' || typeof Bun !== 'undefined') {
      return;
    }

    const fixture = await createFakeNpm();
    const env = {
      ...fixture.baseEnv,
      USE_M_FAKE_NPM_INSTALL_DELAY_MS: '500'
    };
    const results = await installFixtureInFreshProcesses(fixture, 4, env);
    const npmCalls = await readNpmLog(fixture.logFile);

    expect(results.filter(result => result.error)).toEqual([]);
    expect(npmCalls.filter(call => call.args[0] === 'overlap')).toEqual([]);
    expect(npmCalls.filter(call => call.args[0] === 'install')).toHaveLength(1);
    expect(new Set(results.map(result => result.packagePath)).size).toBe(1);
    for (const result of results) {
      expect(result.source).toContain('installed = true');
    }
  }, 60000);

  test(`${moduleName} adopts a complete unmarked alias without reinstalling it`, async () => {
    if (typeof Deno !== 'undefined' || typeof Bun !== 'undefined') {
      return;
    }

    const fixture = await createFakeNpm();
    const packageDirectory = await corruptAlias(fixture, {
      packageJson: JSON.stringify({
        name: 'fixture-pkg',
        version: '1.0.0',
        type: 'module',
        main: 'index.js'
      }),
      source: 'export const adopted = true;\n'
    });
    const packagePath = await resolvers.npm(
      'fixture-pkg@1.0.0',
      resolve,
      { env: fixture.baseEnv, installRetryDelayMs: 0 }
    );
    const npmCalls = await readNpmLog(fixture.logFile);
    const markerPath = path.join(
      fixture.defaultRoot,
      '.use-m',
      'fixture-pkg-v-1.0.0.installed.json'
    );

    expect(packagePath).toBe(path.join(packageDirectory, 'index.js'));
    expect(npmCalls.filter(call => call.args[0] === 'install')).toHaveLength(0);
    expect(JSON.parse(await readFile(markerPath, 'utf8'))).toMatchObject({
      version: '1.0.0',
      requestedVersion: '1.0.0',
      adopted: true
    });
  });

  test(`${moduleName} replaces an unmarked alias that cannot be resolved`, async () => {
    if (typeof Deno !== 'undefined' || typeof Bun !== 'undefined') {
      return;
    }

    const fixture = await createFakeNpm();
    await corruptAlias(fixture, {
      packageJson: '{"name":"fixture-pkg","version":"1.0.0",',
      source: 'export const stale = true;\n'
    });
    const packagePath = await resolvers.npm(
      'fixture-pkg@1.0.0',
      resolve,
      { env: fixture.baseEnv, installRetryDelayMs: 0 }
    );
    const npmCalls = await readNpmLog(fixture.logFile);

    expect(npmCalls.filter(call => call.args[0] === 'install')).toHaveLength(1);
    expect(await readFile(packagePath, 'utf8')).toContain('installed = true');
  });

  test(`${moduleName} preserves unlocked installs and lock-deadline fallback`, async () => {
    if (typeof Deno !== 'undefined' || typeof Bun !== 'undefined') {
      return;
    }

    const unlockedFixture = await createFakeNpm();
    await resolvers.npm('fixture-pkg@1.0.0', resolve, {
      env: unlockedFixture.baseEnv,
      installLock: false,
      installRetryDelayMs: 0
    });

    const blockedFixture = await createFakeNpm();
    const lockPath = path.join(
      blockedFixture.defaultRoot,
      '.use-m',
      'fixture-pkg-v-1.0.0.lock'
    );
    await mkdir(lockPath, { recursive: true });
    await resolvers.npm('fixture-pkg@1.0.0', resolve, {
      env: blockedFixture.baseEnv,
      installLockTimeoutMs: 0,
      installLockPollMs: 0,
      installRetryDelayMs: 0
    });

    const unlockedCalls = await readNpmLog(unlockedFixture.logFile);
    const blockedCalls = await readNpmLog(blockedFixture.logFile);
    expect(unlockedCalls.filter(call => call.args[0] === 'install')).toHaveLength(1);
    expect(blockedCalls.filter(call => call.args[0] === 'install')).toHaveLength(1);
  });

  test(`${moduleName} reports npm-root and unwritable-prefix failures precisely`, async () => {
    if (typeof Deno !== 'undefined' || typeof Bun !== 'undefined') {
      return;
    }

    await expect(resolvers.npm('fixture-pkg@1.0.0')).rejects.toThrow(
      'Failed to get the current resolver'
    );

    const emptyRootFixture = await createFakeNpm();
    await expect(resolvers.npm('fixture-pkg@1.0.0', resolve, {
      env: { ...emptyRootFixture.baseEnv, USE_M_FAKE_NPM_EMPTY_ROOT: '1' }
    })).rejects.toThrow('npm root -g returned an empty global root');

    const configuredFixture = await createFakeNpm();
    await expect(resolvers.npm('fixture-pkg@1.0.0', resolve, {
      env: { ...configuredFixture.baseEnv, npm_config_prefix: '/sys/use-m-test-prefix' }
    })).rejects.toThrow('will not override the configured npm prefix');

    const rootFailureFixture = await createFakeNpm();
    await expect(resolvers.npm('fixture-pkg@1.0.0', resolve, {
      env: {
        ...rootFailureFixture.baseEnv,
        USE_M_FAKE_NPM_DEFAULT_ROOT: '/sys/use-m-test-root/lib/node_modules',
        USE_M_FAKE_NPM_PREFIX_ROOT_FAILURE: '1'
      }
    })).rejects.toThrow('Failed to resolve use-m npm cache root');

    const mkdirFailureFixture = await createFakeNpm();
    await expect(resolvers.npm('fixture-pkg@1.0.0', resolve, {
      env: {
        ...mkdirFailureFixture.baseEnv,
        USE_M_FAKE_NPM_DEFAULT_ROOT: '/sys/use-m-test-root/lib/node_modules',
        XDG_CACHE_HOME: '/sys/use-m-test-cache'
      }
    })).rejects.toThrow('Failed to create use-m npm cache root');
  });

  test(`${moduleName} tolerates unavailable state storage and steals stale locks`, async () => {
    if (typeof Deno !== 'undefined' || typeof Bun !== 'undefined') {
      return;
    }

    const stateFixture = await createFakeNpm();
    await writeFile(path.join(stateFixture.defaultRoot, '.use-m'), 'not a directory');
    const statePath = await resolvers.npm('fixture-pkg@1.0.0', resolve, {
      env: stateFixture.baseEnv,
      installRetryDelayMs: 0
    });
    expect(await readFile(statePath, 'utf8')).toContain('installed = true');

    const retryFixture = await createFakeNpm();
    const retryPath = await resolvers.npm('fixture-pkg@1.0.0', resolve, {
      env: { ...retryFixture.baseEnv, USE_M_FAKE_NPM_INSTALL_FAILURES: '1' },
      installRetryDelayMs: 1
    });
    expect(await readFile(retryPath, 'utf8')).toContain('installAttempt = 2');

    const staleFixture = await createFakeNpm();
    const staleLockPath = path.join(
      staleFixture.defaultRoot,
      '.use-m',
      'fixture-pkg-v-1.0.0.lock'
    );
    await mkdir(staleLockPath, { recursive: true });
    const staleTimestamp = new Date(Date.now() - 60_000);
    await utimes(staleLockPath, staleTimestamp, staleTimestamp);
    const stalePath = await resolvers.npm('fixture-pkg@1.0.0', resolve, {
      env: staleFixture.baseEnv,
      installLockStaleMs: 1,
      installLockPollMs: 0,
      installRetryDelayMs: 0
    });
    expect(await readFile(stalePath, 'utf8')).toContain('installed = true');
  });

  test(`${moduleName} repairs a recoverable import failure through makeUse`, async () => {
    if (typeof Deno !== 'undefined' || typeof Bun !== 'undefined') {
      return;
    }

    const fixture = await createFakeNpm();
    const importedPaths = [];
    const use = await makeUse({
      env: fixture.baseEnv,
      pathResolver: resolve,
      specifierResolver: 'npm',
      installRetryDelayMs: 0,
      import: async modulePath => {
        importedPaths.push(modulePath);
        if (importedPaths.length === 1) {
          throw new Error(`Failed to import module from '${modulePath}'.`, {
            cause: new SyntaxError('truncated module')
          });
        }
        return modulePath;
      }
    });

    const repairedPath = await use('fixture-pkg@1.0.0');
    const npmCalls = await readNpmLog(fixture.logFile);
    expect(importedPaths).toHaveLength(2);
    expect(repairedPath).toContain('use-m-retry=');
    expect(npmCalls.filter(call => call.args[0] === 'install')).toHaveLength(2);
  });

  test(`${moduleName} preserves legacy package-exports resolution branches`, async () => {
    if (typeof Deno !== 'undefined' || typeof Bun !== 'undefined') {
      return;
    }

    for (const exportsField of [
      './entry.js',
      { '.': './entry.js' },
      { '.': { default: './entry.js' } }
    ]) {
      const fixture = await createFakeNpm();
      const packageDirectory = await corruptAlias(fixture, {
        packageJson: JSON.stringify({
          name: 'fixture-pkg',
          version: '1.0.0',
          type: 'module',
          exports: exportsField
        })
      });
      const entryPath = path.join(packageDirectory, 'entry.js');
      await writeFile(entryPath, 'export const throughExports = true;\n');
      const exportsResolver = async candidate => {
        if (candidate === entryPath) return candidate;
        const error = new Error(`Cannot find ${candidate}`);
        error.code = 'MODULE_NOT_FOUND';
        throw error;
      };

      await expect(resolvers.npm(
        'fixture-pkg@1.0.0',
        exportsResolver,
        { env: fixture.baseEnv, installRetryDelayMs: 0 }
      )).resolves.toBe(entryPath);
      const npmCalls = await readNpmLog(fixture.logFile);
      expect(npmCalls.filter(call => call.args[0] === 'install')).toHaveLength(0);
    }
  });
});
