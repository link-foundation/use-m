import { use } from '../use.mjs';

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