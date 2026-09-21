import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { createRequire, syncBuiltinESMExports } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { promisify } from 'node:util';
import { afterEach, describe, expect, test } from '../src/test-adapter.mjs';
import * as esmApi from '../src/use.mjs';

const require = createRequire(import.meta.url);
const cjsApi = require('../src/use.cjs');
const implementations = [
  ['ESM', esmApi],
  ['CommonJS', cjsApi],
];
const temporaryDirectories = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map(directory =>
    rm(directory, { recursive: true, force: true })
  ));
});

const makeTemporaryDirectory = async (prefix) => {
  const directory = await mkdtemp(path.join(tmpdir(), prefix));
  temporaryDirectories.push(directory);
  return directory;
};

const withGlobal = async (name, value, run) => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, name);
  Object.defineProperty(globalThis, name, {
    configurable: true,
    writable: true,
    value,
  });
  try {
    return await run();
  } finally {
    if (descriptor) {
      Object.defineProperty(globalThis, name, descriptor);
    } else {
      delete globalThis[name];
    }
  }
};

const createFakeBun = async () => {
  const root = await makeTemporaryDirectory('use-m-fake-bun-');
  const bunDirectory = path.join(root, 'bun-home', 'bin');
  const logFile = path.join(root, 'bun.log');
  await mkdir(bunDirectory, { recursive: true });
  await writeFile(logFile, '');
  return { bunDirectory, logFile, root };
};

const withFakeBunExec = async (fixture, behavior, run) => {
  const childProcess = require('node:child_process');
  const os = require('node:os');
  const originalExec = childProcess.exec;
  const originalExecAsync = promisify(originalExec);
  const originalHomedir = os.homedir;
  const customPromisify = Symbol.for('nodejs.util.promisify.custom');
  const fakeExec = () => {
    throw new Error('The callback form of fake exec must not be used');
  };
  fakeExec[customPromisify] = async (command, options) => {
    if (!command.startsWith('bun ')) {
      return originalExecAsync(command, options);
    }
    await writeFile(fixture.logFile, `${command}\n`, { flag: 'a' });
    if (command === 'bun pm bin -g') {
      if (behavior.pmFailure) throw new Error('fake bun pm failure');
      return { stdout: `${fixture.bunDirectory}\n`, stderr: '' };
    }
    const match = command.match(/^bun add -g (.+) --silent$/);
    if (!match) throw new Error(`Unexpected fake Bun command: ${command}`);
    if (behavior.addFailure && command.includes('broken-pkg')) {
      throw new Error('fake bun install failure');
    }
    const specifier = match[1];
    const marker = specifier.indexOf('@npm:');
    const alias = specifier.slice(0, marker);
    const requested = specifier.slice(marker + 5);
    const separator = requested.lastIndexOf('@');
    const packageName = requested.slice(0, separator);
    const requestedVersion = requested.slice(separator + 1);
    const version = requestedVersion === 'latest' ? '9.9.9' : requestedVersion;
    const packageDirectory = path.join(
      fixture.root,
      'bun-home',
      'install',
      'global',
      'node_modules',
      alias
    );
    await mkdir(packageDirectory, { recursive: true });
    await writeFile(path.join(packageDirectory, 'package.json'), JSON.stringify({
      name: packageName,
      version,
      type: 'module',
      main: 'index.js',
    }));
    await writeFile(path.join(packageDirectory, 'index.js'), 'export const loaded = true;\n');
    return { stdout: '', stderr: '' };
  };
  childProcess.exec = fakeExec;
  os.homedir = () => path.join(fixture.root, 'bun-home');
  syncBuiltinESMExports();
  try {
    return await run();
  } finally {
    childProcess.exec = originalExec;
    os.homedir = originalHomedir;
    syncBuiltinESMExports();
  }
};

for (const [format, api] of implementations) {
  describe(`${format} pre-change public contract`, () => {
    test('validates and parses package specifiers', () => {
      for (const invalid of [undefined, null, '', 42]) {
        expect(() => api.parseModuleSpecifier(invalid)).toThrow('Name for a package');
      }
      expect(api.parseModuleSpecifier('pkg@/feature')).toEqual({
        packageName: 'pkg',
        version: 'latest',
        modulePath: '/feature',
      });
      expect(api.parseModuleSpecifier('@scope/pkg/feature')).toEqual({
        packageName: '@scope/pkg',
        version: 'latest',
        modulePath: '/feature',
      });
    });

    test('keeps every URL resolver output stable', async () => {
      await expect(api.resolvers.deno('@scope/pkg@1.2.3/subpath')).resolves.toBe(
        'https://esm.sh/@scope/pkg@1.2.3/subpath'
      );
      await expect(api.resolvers.jsdelivr('pkg@1.0.0/file.mjs')).resolves.toBe(
        'https://cdn.jsdelivr.net/npm/pkg-es@1.0.0/file.mjs.js'
      );
      await expect(api.resolvers.unpkg('pkg')).resolves.toBe(
        'https://unpkg.com/pkg-es@latest/pkg.js'
      );
      await expect(api.resolvers.jspm('pkg')).resolves.toBe('https://jspm.dev/pkg');
    });

    test('loads built-ins and preserves browser-only behavior', async () => {
      const performanceModule = await api.resolvers.builtin('performance');
      expect(typeof performanceModule.now).toBe('function');
      const pathModule = await api.resolvers.builtin('node:path');
      expect(typeof pathModule.join).toBe('function');
      await expect(api.resolvers.builtin('definitely-not-a-node-builtin')).resolves.toBeNull();

      await withGlobal('window', { location: { href: 'https://example.test/app/' } }, async () => {
        const consoleModule = await api.resolvers.builtin('console');
        const urlModule = await api.resolvers.builtin('url');
        const performanceModuleInBrowser = await api.resolvers.builtin('performance');
        expect(consoleModule.default).toBe(console);
        expect(urlModule.URL).toBe(URL);
        expect(typeof performanceModuleInBrowser.now).toBe('function');
        await withGlobal('crypto', { subtle: { fixture: true } }, async () => {
          const cryptoModule = await api.resolvers.builtin('crypto');
          expect(cryptoModule.subtle.fixture).toBe(true);
        });
        await withGlobal('crypto', undefined, async () => {
          await expect(api.resolvers.builtin('crypto')).rejects.toThrow(
            "Failed to load built-in module 'crypto' in browser environment"
          );
        });
        await expect(api.resolvers.builtin('fs')).rejects.toThrow('not available in browser');
        await expect(api.resolvers.builtin('browser-package')).resolves.toBeNull();
      });

      await withGlobal('Deno', {}, async () => {
        const fsPromises = await api.resolvers.builtin('fs/promises');
        expect(fsPromises.default).toBeDefined();
        expect(fsPromises.readFile.constructor.name).toBe('AsyncFunction');
      });
    });

    test('resolves local modules and reports resolver failures', async () => {
      const directory = await makeTemporaryDirectory('use-m-relative-contract-');
      const callerPath = path.join(directory, 'caller.mjs');
      const modulePath = path.join(directory, 'fixture.mjs');
      await writeFile(callerPath, '');
      await writeFile(modulePath, 'export const answer = 42;\n');
      const callerUrl = pathToFileURL(callerPath).href;

      const loaded = await api.resolvers.relative('./fixture.mjs', null, callerUrl);
      expect(loaded.answer).toBe(42);
      await expect(api.resolvers.relative('pkg', null, callerUrl)).resolves.toBeNull();
      await expect(api.resolvers.relative('./fixture.mjs')).rejects.toThrow(
        'Path resolver is required'
      );
      await expect(api.resolvers.relative('./missing.mjs', async () => {
        throw new Error('resolver failed');
      })).rejects.toThrow("Failed to resolve relative path './missing.mjs'");
    });

    test('unwraps default-only modules and wraps import errors', async () => {
      await expect(api.baseUse('data:text/javascript,export default 42')).resolves.toBe(42);
      const namespace = await api.baseUse(
        'data:text/javascript,export default 42; export const named = true'
      );
      expect(namespace.default).toBe(42);
      expect(namespace.named).toBe(true);
      await expect(api.baseUse(
        'data:text/javascript,export default 43; export const __esModule = true'
      )).resolves.toBe(43);
      await expect(api.baseUse('file:///definitely/missing/use-m-contract.mjs')).rejects.toThrow(
        'Failed to import module from'
      );
    });

    test('keeps explicit resolver and multi-resolver makeUse behavior stable', async () => {
      const directUse = await api.makeUse({
        scriptPath: '/tmp/use-m-contract.mjs',
        pathResolver: value => value,
        specifierResolver: async value => `custom:${value}`,
        import: async value => ({ value }),
      });
      await expect(directUse('fixture@1')).resolves.toEqual({ value: 'custom:fixture@1' });

      const attempts = [];
      const fallbackUse = await api.makeUse({
        scriptPath: 'https://example.test/app.mjs',
        pathResolver: value => value,
        specifierResolvers: [
          async value => `first:${value}`,
          async value => `second:${value}`,
        ],
        import: async value => {
          attempts.push(value);
          if (value.startsWith('first:')) throw new Error('first failed');
          return value;
        },
      });
      await expect(fallbackUse('fixture@1')).resolves.toBe('second:fixture@1');
      expect(attempts).toEqual(['first:fixture@1', 'second:fixture@1']);
      await expect(fallbackUse('node:path')).resolves.toHaveProperty('join');

      const automaticPathUse = await api.makeUse({
        scriptPath: import.meta.url,
        specifierResolver: async value => `automatic:${value}`,
        import: async value => value,
      });
      await expect(automaticPathUse('fixture@2')).resolves.toBe('automatic:fixture@2');

      await withGlobal('window', { location: { href: 'https://example.test/' } }, async () => {
        await withGlobal('document', {}, async () => {
          const browserUse = await api.makeUse({ import: async value => value });
          await expect(browserUse('fixture@3')).resolves.toBe('https://esm.sh/fixture@3');
        });
      });

      await withGlobal('Deno', {}, async () => {
        const denoUse = await api.makeUse({
          scriptPath: import.meta.url,
          pathResolver: value => value,
          import: async value => value,
        });
        await expect(denoUse('fixture@4')).resolves.toBe('https://esm.sh/fixture@4');
      });

      await withGlobal('Bun', {}, async () => {
        const bunUse = await api.makeUse({
          scriptPath: import.meta.url,
          pathResolver: value => value,
          import: async value => value,
        });
        await expect(bunUse('node:path')).resolves.toHaveProperty('join');
      });
    });

    test('retains fallback validation, retry delay, and non-Error reporting', async () => {
      const attempts = [];
      await expect(api.loadWithFallback(
        ['one'],
        async (_source, attempt) => {
          attempts.push(attempt);
          throw 'plain failure';
        },
        { maxAttemptsPerSource: 2, retryDelayMs: 1 }
      )).rejects.toThrow('plain failure');
      expect(attempts).toEqual([1, 2]);
    });

  });
}

describe('Bun resolver pre-change public contract', () => {
  test('retains install, reuse, package resolution, and error behavior', async () => {
    if (typeof Deno !== 'undefined' || typeof Bun !== 'undefined') return;
    const fixture = await createFakeBun();
    const resolve = createRequire(import.meta.url).resolve;

    const behavior = { addFailure: true, pmFailure: false };
    await withFakeBunExec(fixture, behavior, async () => {
      for (const [format, api] of implementations) {
        const packageName = `fixture-${format.toLowerCase()}`;
        const latest = await api.resolvers.bun(packageName, resolve);
        expect(latest).toContain(path.join('node_modules', `${packageName}-v-latest`, 'index.js'));
        const pinned = await api.resolvers.bun(`${packageName}@1.2.3`, resolve);
        expect(pinned).toContain(path.join('node_modules', `${packageName}-v-1.2.3`, 'index.js'));
        await expect(api.resolvers.bun(`${packageName}@1.2.3`, resolve)).resolves.toBe(pinned);
        await expect(api.resolvers.bun('broken-pkg@1.0.0', resolve)).rejects.toThrow(
          'Failed to install broken-pkg@1.0.0 globally with Bun'
        );
        await expect(api.resolvers.bun('fixture-pkg@1.0.0')).rejects.toThrow(
          'Failed to get the current resolver'
        );

        const exportsPackageName = `exports-${format.toLowerCase()}`;
        const exportsAlias = `${exportsPackageName}-v-1.0.0`;
        const exportsDirectory = path.join(
          fixture.root,
          'bun-home',
          'install',
          'global',
          'node_modules',
          exportsAlias
        );
        const exportsEntry = path.join(exportsDirectory, 'entry.js');
        await mkdir(exportsDirectory, { recursive: true });
        await writeFile(path.join(exportsDirectory, 'package.json'), JSON.stringify({
          name: exportsPackageName,
          version: '1.0.0',
          exports: { '.': { import: './entry.js' } },
        }));
        await writeFile(exportsEntry, 'export const throughExports = true;\n');
        const exportsResolver = async candidate => {
          if (candidate === exportsEntry) return candidate;
          const error = new Error(`Cannot find ${candidate}`);
          error.code = 'MODULE_NOT_FOUND';
          throw error;
        };
        await expect(api.resolvers.bun(
          `${exportsPackageName}@1.0.0`,
          exportsResolver
        )).resolves.toBe(exportsEntry);

        const unresolvedName = `unresolved-${format.toLowerCase()}`;
        const unresolvedDirectory = path.join(
          fixture.root,
          'bun-home',
          'install',
          'global',
          'node_modules',
          `${unresolvedName}-v-1.0.0`
        );
        await mkdir(unresolvedDirectory, { recursive: true });
        const missingResolver = async candidate => {
          const error = new Error(`Cannot find ${candidate}`);
          error.code = 'MODULE_NOT_FOUND';
          throw error;
        };
        await expect(api.resolvers.bun(
          `${unresolvedName}@1.0.0`,
          missingResolver
        )).rejects.toThrow('Failed to resolve the path');

        await expect(api.resolvers.bun(`${packageName}@1.2.3`, async () => {
          const error = new Error('resolver permission failure');
          error.code = 'EACCES';
          throw error;
        })).rejects.toThrow('Failed to resolve module');
      }

    });

    const calls = (await readFile(fixture.logFile, 'utf8')).trim().split('\n');
    expect(calls.length).toBeGreaterThanOrEqual(10);
  }, 30_000);
});
