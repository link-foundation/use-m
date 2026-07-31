const { chmod, mkdir, mkdtemp, readFile, rm, writeFile } = require('node:fs/promises');
const { execFile } = require('node:child_process');
const { tmpdir } = require('node:os');
const path = require('node:path');
const { promisify } = require('node:util');
const { describe, test, expect, afterEach } = require('../src/test-adapter.cjs');
const { resolvers } = require('../src/use.cjs');

const moduleName = `[${__filename.split('.').pop()} module]`;
const resolve = require.resolve;
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
  const installAttempt = fs.readFileSync(logFile, 'utf8')
    .trim()
    .split('\\n')
    .filter(Boolean)
    .map(line => JSON.parse(line))
    .filter(call => call.args[0] === 'install')
    .length;
  const failuresBeforeSuccess = Number(process.env.USE_M_FAKE_NPM_INSTALL_FAILURES || 0);

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
    JSON.stringify({ name: alias, version: installedVersion, type: 'module', main: 'index.js' })
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
  const useModulePath = path.resolve(__dirname, '../src/use.cjs');
  const packageEntryPath = path.join(fixture.defaultRoot, 'fixture-pkg-v-1.0.0', 'index.js');
  const source = `
    const { makeUse } = require(${JSON.stringify(useModulePath)});
    const { readFile } = require('node:fs/promises');
    (async () => {
      const use = await makeUse();
      const loaded = await use('fixture-pkg@1.0.0');
      process.stdout.write(JSON.stringify(loaded));
    })().catch(async error => {
      console.error(error);
      console.error('entry after recovery:', await readFile(${JSON.stringify(packageEntryPath)}, 'utf8'));
      console.error('npm calls:', await readFile(${JSON.stringify(fixture.logFile)}, 'utf8'));
      process.exitCode = 1;
    });
  `;
  const { stdout } = await execFileAsync(
    process.execPath,
    ['--eval', source],
    { env: fixture.baseEnv }
  );
  return JSON.parse(stdout);
};

const failFixtureImportInFreshProcess = async (fixture) => {
  const useModulePath = path.resolve(__dirname, '../src/use.cjs');
  const source = `
    const { makeUse } = require(${JSON.stringify(useModulePath)});
    (async () => {
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
    })().catch(error => {
      console.error(error);
      process.exitCode = 1;
    });
  `;
  const { stdout } = await execFileAsync(
    process.execPath,
    ['--eval', source],
    { env: fixture.baseEnv }
  );
  return JSON.parse(stdout);
};

const repairFixtureWithRmRetryProbeInFreshProcess = async (fixture) => {
  const useModulePath = path.resolve(__dirname, '../src/use.cjs');
  const source = `
    const { syncBuiltinESMExports } = require('node:module');
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

    const { resolvers } = require(${JSON.stringify(useModulePath)});
    resolvers.npm(
      'fixture-pkg@1.0.0',
      require.resolve,
      { env: process.env, repair: true, installRetryDelayMs: 0 }
    ).then(async packagePath => {
      const installedSource = await fsPromises.readFile(packagePath, 'utf8');
      process.stdout.write(JSON.stringify({ cleanupCalls, installedSource }));
    }).catch(error => {
      console.error(error);
      process.exitCode = 1;
    });
  `;
  const { stdout } = await execFileAsync(
    process.execPath,
    ['--eval', source],
    { env: fixture.baseEnv }
  );
  return JSON.parse(stdout);
};

const installFixtureInFreshProcesses = async (fixture, count, env) => {
  const useModulePath = path.resolve(__dirname, '../src/use.cjs');
  const source = `
    const { readFile } = require('node:fs/promises');
    const { resolvers } = require(${JSON.stringify(useModulePath)});
    resolvers.npm(
      'fixture-pkg@1.0.0',
      require.resolve,
      { env: process.env, installRetryDelayMs: 0 }
    ).then(async packagePath => {
      process.stdout.write(JSON.stringify({ packagePath, source: await readFile(packagePath, 'utf8') }));
    }).catch(error => {
      console.error(error);
      process.exitCode = 1;
    });
  `;
  return Promise.all(Array.from({ length: count }, async () => {
    try {
      const { stdout } = await execFileAsync(
        process.execPath,
        ['--eval', source],
        { env }
      );
      return JSON.parse(stdout);
    } catch (error) {
      return { error: error.stderr || error.message };
    }
  }));
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
});
