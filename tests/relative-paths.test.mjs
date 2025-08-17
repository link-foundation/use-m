import { use } from '../use.mjs';
import { describe, test } from '../test-adapter.mjs';
import assert from 'node:assert';

describe('Relative Path Resolution', () => {
  test('should import JS file from same directory using ./', async () => {
    const testModule = await use('./browser-server/test-helper.js');
    assert.strictEqual(testModule.message, 'Helper module loaded');
    assert.strictEqual(typeof testModule.testFunction, 'function');
  });

  test('should import JSON file from same directory using ./', async () => {
    const testData = await use('./browser-server/test-data.json');
    assert.strictEqual(testData.test, 'data');
    assert.strictEqual(testData.value, 123);
    // Check array elements individually to avoid Jest comparison issues
    assert.ok(Array.isArray(testData.array), 'array should be an array');
    assert.strictEqual(testData.array.length, 3, 'array should have 3 elements');
    assert.strictEqual(testData.array[0], 1, 'first element should be 1');
    assert.strictEqual(testData.array[1], 2, 'second element should be 2');
    assert.strictEqual(testData.array[2], 3, 'third element should be 3');
  });

  test('should import JS file from parent directory using ../', async () => {
    const parentModule = await use('../use.mjs');
    assert.strictEqual(typeof parentModule.use, 'function');
  });

  test('should import from subdirectory using ./subfolder/', async () => {
    const subModule = await use('./browser-server/subfolder/nested.js');
    assert.strictEqual(subModule.nested, true);
    assert.strictEqual(subModule.level, 'subfolder');
  });

  test('should import JSON from subdirectory', async () => {
    const subData = await use('./browser-server/subfolder/nested-data.json');
    assert.strictEqual(subData.level, 'nested');
    assert.strictEqual(subData.depth, 1);
  });

  test('should handle complex relative paths (../)', async () => {
    const rootModule = await use('../package.json');
    assert.strictEqual(rootModule.name, 'use-m');
  });

  test('should work with mixed relative and npm imports', async () => {
    const relModule = await use('./browser-server/test-helper.js');
    const lodash = await use('lodash@4.17.21');
    const relModule2 = await use('./browser-server/test-data.json');
    
    assert.strictEqual(relModule.message, 'Helper module loaded');
    assert.strictEqual(typeof lodash.add, 'function');
    assert.strictEqual(relModule2.value, 123);
    assert.strictEqual(lodash.add(1, 2), 3);
  });

  test('should maintain correct context for nested relative imports', async () => {
    // Test that relative paths are resolved relative to the calling file
    const helper = await use('./browser-server/test-helper.js');
    const nested = await use('./browser-server/subfolder/nested.js');

    // Both should load successfully
    assert.ok(helper.message);
    assert.ok(nested.nested);

    // Test loading the same file from different relative paths
    const useFromParent = await use('../use.mjs');
    const packageFromParent = await use('../package.json');

    // Both should have proper exports
    assert.strictEqual(typeof useFromParent.use, 'function');
    assert.strictEqual(packageFromParent.name, 'use-m');
  });
});