#!/usr/bin/env node

/**
 * Test script to reproduce issue #45: fetch is not defined on Windows
 *
 * This script checks:
 * 1. Node.js version
 * 2. Whether fetch is available
 * 3. Whether we can load use-m with fetch
 */

console.log('=== Fetch Availability Test ===');
console.log('Node version:', process.version);
console.log('Platform:', process.platform);
console.log('Fetch available:', typeof fetch !== 'undefined');
console.log('Global fetch:', typeof globalThis.fetch !== 'undefined');

// Test if fetch works
if (typeof fetch === 'undefined') {
  console.error('\n❌ ERROR: fetch is not defined!');
  console.log('\nThis is the bug described in issue #45');
  console.log('Expected: fetch should be available in Node.js 18+');
  console.log('Actual: fetch is undefined');
  process.exit(1);
} else {
  console.log('\n✅ fetch is available');

  // Try to load use-m
  try {
    console.log('\nTrying to load use-m...');
    const { use } = eval(await (await fetch('https://unpkg.com/use-m/use.js')).text());
    console.log('✅ Successfully loaded use-m');

    // Test using a package
    const _ = await use('lodash@4.17.21');
    console.log('✅ Successfully loaded lodash via use-m');
    console.log('Test: _.add(1, 2) =', _.add(1, 2));
  } catch (error) {
    console.error('❌ Failed to load use-m:', error.message);
    process.exit(1);
  }
}
