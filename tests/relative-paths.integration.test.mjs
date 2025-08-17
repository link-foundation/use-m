import { describe, test } from '../test-adapter.mjs';
import assert from 'node:assert';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { sh } from 'command-stream';

const moduleName = `[${import.meta.url.split('.').pop()} module]`;

describe(`${moduleName} Relative Path Resolution (Integration)`, () => {
  test(`${moduleName} relative paths should work when run directly with Node.js`, async () => {
    // Run our working direct test to verify functionality
    try {
      // report bugs
      // const result = (await $`cd /Users/konard/Code/Archive/link-foundation/use-m/tests && node relative-paths-test-runner.mjs`).stdout;
      // const result = await (await $`cd /Users/konard/Code/Archive/link-foundation/use-m/tests && node relative-paths-test-runner.mjs`).text();
      
      let runtime = 'node';
      if (typeof Bun !== 'undefined') {
        runtime = 'bun';
      } else if (typeof Deno !== 'undefined') {
        runtime = 'deno';
      }

      // For some reason export NO_COLOR=1 does not have effect when run at `npm test` in parallel, but works when run separately: `npm test -- tests/relative-paths.integration.test.mjs`
      // const result = (await sh(`(export NO_COLOR=1; cd /Users/konard/Code/Archive/link-foundation/use-m/tests && ${runtime} relative-paths-test-runner.mjs)`, { mirror: false })).stdout;

      const folderPath = path.dirname(fileURLToPath(import.meta.url));

      console.log(folderPath);

      const result = (await sh(`(cd "${folderPath}" && ${runtime} relative-paths-test-runner.mjs)`, { mirror: false })).stdout;

      function stripAnsiColors(str) {
        return str.replace(/\x1B\[[0-9;]*m/g, '');
      }

      const cleanResult = stripAnsiColors(result);

      console.log(cleanResult);

      // Check that it contains success indicators
      assert(cleanResult.includes('✅ All direct tests passed!'), 'Direct test should pass');
      assert(cleanResult.includes('Helper module loaded'), 'JS import should work');
      assert(cleanResult.includes('Value: 123'), 'JSON import should work');
      assert(cleanResult.includes('use function exists: true'), 'Parent directory import should work');
      assert(cleanResult.includes('Nested: true'), 'Subdirectory import should work');
      assert(cleanResult.includes('Package name: use-m'), 'Complex relative path should work');
    } catch (error) {
      assert.fail(`Direct relative path test failed: ${error.message}`);
    }
  });
});