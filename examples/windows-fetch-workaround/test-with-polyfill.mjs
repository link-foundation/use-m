#!/usr/bin/env node

/**
 * Example: Using use-m on Windows with fetch polyfill
 *
 * This demonstrates the workaround for issue #45 where fetch is not defined
 * in certain Windows contexts (Git Bash, shebang execution).
 *
 * Solution: Import the fetch-polyfill before loading use-m
 */

console.log('Platform:', process.platform);
console.log('Node version:', process.version);
console.log('Fetch available initially:', typeof fetch !== 'undefined');

// Import fetch polyfill to ensure fetch is available
// This handles the Windows Git Bash issue where fetch isn't in global scope
await import('../../fetch-polyfill.js');

console.log('Fetch available after polyfill:', typeof fetch !== 'undefined');

// Now load use-m as usual
const { use } = eval(
  await (
    await fetch('https://unpkg.com/use-m/use.js')
  ).text()
);

console.log('\n✅ Successfully loaded use-m');

// Test with lodash
const _ = await use('lodash@4.17.21');
console.log('✅ Successfully loaded lodash');
console.log('Test: _.add(1, 2) =', _.add(1, 2));

console.log('\n🎉 All tests passed!');
