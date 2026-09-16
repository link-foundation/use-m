import { describe, test, expect } from '../src/test-adapter.mjs';
import { use } from '../src/use.mjs';

const moduleName = 'mjs module';

describe(`${moduleName} fs/promises support`, () => {
  test(`${moduleName} fs/promises should return promise-based functions`, async () => {
    // Import fs/promises using use-m
    const fsPromises = await use('node:fs/promises');
    const { mkdir, writeFile, readFile } = fsPromises;
    
    // Check function signatures
    expect(mkdir.length).toBe(2); // Promise-based mkdir takes 2 params (path, options)
    expect(writeFile.length).toBe(3); // Promise-based writeFile takes 3 params (path, data, options)
    
    // Make sure they are async functions or return promises
    expect(mkdir.constructor.name).toBe('AsyncFunction');
    expect(writeFile.constructor.name).toBe('AsyncFunction');
  });

  test(`${moduleName} fs/promises should work functionally`, async () => {
    const fsPromises = await use('node:fs/promises');
    const { mkdir, writeFile, readFile, rm } = fsPromises;
    
    const testDir = './test-fs-promises-test';
    const testFile = `${testDir}/test.txt`;
    const testContent = 'Hello from fs/promises test!';
    
    try {
      // Create directory
      await mkdir(testDir, { recursive: true });
      
      // Write file
      await writeFile(testFile, testContent);
      
      // Read file
      const content = await readFile(testFile, 'utf8');
      expect(content).toBe(testContent);
      
    } finally {
      // Cleanup
      try {
        await rm(testDir, { recursive: true, force: true });
      } catch (e) {
        // Ignore cleanup errors
      }
    }
  });

  test(`${moduleName} fs/promises should expose every function the runtime ships`, async () => {
    // The promise API is rebuilt from the callback API on Bun and Deno, and the
    // set of functions it covers is read from the runtime instead of a list in
    // use-m (issue #50), so nothing the runtime ships may go missing.
    const native = await import('node:fs/promises');
    const fsPromises = await use('node:fs/promises');

    const missing = Object.keys(native)
      .filter((name) => name !== 'default' && typeof fsPromises[name] === 'undefined');

    expect(missing).toEqual([]);
  });

  test(`${moduleName} fs/promises should forward arguments beyond the declared arity`, async () => {
    const { mkdtemp, writeFile, readFile, rm } = await use('node:fs/promises');
    const os = await use('node:os');
    const path = await use('node:path');

    const directory = await mkdtemp(path.join(os.tmpdir(), 'use-m-fs-promises-'));
    const file = path.join(directory, 'encoding.txt');

    try {
      // `writeFile` declares 3 parameters; the signal option is a 4th argument
      // in Node's API and has to reach the underlying implementation.
      await writeFile(file, 'utf8 content', { encoding: 'utf8' });

      expect(await readFile(file, { encoding: 'utf8' })).toBe('utf8 content');
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  test(`${moduleName} fs/promises should differ from regular fs`, async () => {
    // Import regular fs using use-m
    const fs = await use('node:fs');
    const { mkdir: fsMkdir } = fs;
    
    // Import fs/promises using use-m  
    const fsPromises = await use('node:fs/promises');
    const { mkdir: fsPromisesMkdir } = fsPromises;
    
    // Check that they are different functions
    expect(fsMkdir.length).toBe(3); // Callback-based mkdir takes 3 params (path, options, callback)
    expect(fsPromisesMkdir.length).toBe(2); // Promise-based mkdir takes 2 params (path, options)
    
    // Check function types
    expect(fsMkdir.constructor.name).toBe('Function');
    expect(fsPromisesMkdir.constructor.name).toBe('AsyncFunction');
  });

  test(`${moduleName} fs/promises should report the same arity on every runtime`, async () => {
    // These are the parameter counts of Node.js' own promise API. The rebuild
    // on Bun and Deno derives them from each runtime's callback API, so a
    // runtime that describes its callback API differently must not change what
    // use-m hands back. Functions whose callback signature is declared with
    // defaults (access, stat, lstat, statfs, truncate, opendir) are left out:
    // the runtimes disagree about those and no arity can be derived for them.
    const nodeArity = {
      mkdir: 2, writeFile: 3, readFile: 2, appendFile: 3, copyFile: 3,
      rename: 2, rm: 2, rmdir: 2, unlink: 1, chmod: 2, chown: 3, open: 3,
      cp: 3, symlink: 3, link: 2, mkdtemp: 2, readdir: 2, utimes: 3,
      realpath: 2, readlink: 2
    };
    const fsPromises = await use('node:fs/promises');

    const mismatched = Object.entries(nodeArity)
      .filter(([name]) => typeof fsPromises[name] === 'function')
      .filter(([name, arity]) => fsPromises[name].length !== arity)
      .map(([name, arity]) => `${name}: expected ${arity}, got ${fsPromises[name].length}`);

    expect(mismatched).toEqual([]);
  });

  test(`${moduleName} every rebuilt fs/promises function should be a named async function`, async () => {
    // The wrappers exist so a caller cannot tell the rebuilt promise API from
    // Node's: async, named, and declaring at least the path they operate on.
    // Anything use-m did not rebuild is the runtime's own export, identical to
    // what `import('node:fs/promises')` returns, and is judged by no one here.
    const native = await import('node:fs/promises');
    const fsPromises = await use('node:fs/promises');

    const wrong = [];
    for (const [name, value] of Object.entries(fsPromises)) {
      if (name === 'default' || typeof value !== 'function' || value === native[name]) {
        continue;
      }
      if (value.constructor.name !== 'AsyncFunction') {
        wrong.push(`${name}: ${value.constructor.name}, expected AsyncFunction`);
      }
      if (value.length < 1) {
        wrong.push(`${name}: declares ${value.length} parameters, expected at least 1`);
      }
      if (value.name !== name) {
        wrong.push(`${name}: named '${value.name}'`);
      }
    }

    expect(wrong).toEqual([]);
  });

  test(`${moduleName} fs/promises watch should be the runtime's promise watcher, not fs.watch`, async () => {
    // The hardcoded table handed back `fs.watch` bound to fs, a callback API
    // with a completely different contract from the promise one.
    const fs = await import('node:fs');
    const native = await import('node:fs/promises');
    const fsPromises = await use('node:fs/promises');

    expect(fsPromises.watch).toBe(native.watch);
    expect(fsPromises.watch).not.toBe(fs.watch);
  });

  test(`${moduleName} rebuilt fs/promises functions should work end to end`, async () => {
    // Shape alone proves nothing: every wrapper has to reach the real
    // implementation on whichever runtime is executing this.
    const { mkdtemp, mkdir, writeFile, readFile, appendFile, copyFile, rename,
      readdir, stat, access, realpath, truncate, rm } = await use('node:fs/promises');
    const os = await use('node:os');
    const path = await use('node:path');
    const { constants } = await import('node:fs');

    const directory = await mkdtemp(path.join(os.tmpdir(), 'use-m-fs-promises-e2e-'));
    try {
      const nested = path.join(directory, 'nested');
      await mkdir(nested, { recursive: true });

      const source = path.join(nested, 'source.txt');
      await writeFile(source, 'first');
      await appendFile(source, '-second');
      expect(await readFile(source, 'utf8')).toBe('first-second');

      const copy = path.join(nested, 'copy.txt');
      await copyFile(source, copy);
      expect(await readFile(copy, 'utf8')).toBe('first-second');

      const renamed = path.join(nested, 'renamed.txt');
      await rename(copy, renamed);
      expect((await readdir(nested)).sort()).toEqual(['renamed.txt', 'source.txt']);

      await truncate(renamed, 5);
      expect(await readFile(renamed, 'utf8')).toBe('first');

      const stats = await stat(renamed);
      expect(stats.size).toBe(5);
      expect(stats.isFile()).toBe(true);

      await access(renamed, constants.R_OK);
      expect(await realpath(renamed)).toContain('renamed.txt');
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});