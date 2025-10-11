#!/usr/bin/env node

/**
 * Example: Testing fetch availability without polyfill
 *
 * This script reproduces issue #45 by attempting to use fetch without
 * ensuring it's available first.
 */

console.log('Platform:', process.platform);
console.log('Node version:', process.version);
console.log('Fetch available:', typeof fetch !== 'undefined');

if (typeof fetch === 'undefined') {
  console.error('\n❌ ERROR: fetch is not defined!');
  console.error('\nThis is the issue described in #45.');
  console.error('To fix this, use the fetch polyfill:');
  console.error('  await import("use-m/fetch-polyfill.js");');
  console.error('\nOr see: examples/windows-fetch-workaround/test-with-polyfill.mjs');
  process.exit(1);
}

// Attempt to load use-m
try {
  const { use } = eval(
    await (
      await fetch('https://unpkg.com/use-m/use.js')
    ).text()
  );

  console.log('✅ Successfully loaded use-m');

  const _ = await use('lodash@4.17.21');
  console.log('✅ Test passed: _.add(1, 2) =', _.add(1, 2));
} catch (error) {
  console.error('❌ Failed:', error.message);
  process.exit(1);
}
