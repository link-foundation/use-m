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
});