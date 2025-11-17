#!/usr/bin/env node

/**
 * Test the fetch polyfill by simulating a scenario where fetch is not available
 */

console.log('=== Testing fetch polyfill with simulated missing fetch ===');
console.log('Node version:', process.version);
console.log('Platform:', process.platform);
console.log('Fetch initially available:', typeof fetch !== 'undefined');

// Simulate the Windows Git Bash issue by removing fetch from global scope
const originalFetch = globalThis.fetch;
delete globalThis.fetch;

console.log('Fetch after deletion:', typeof fetch !== 'undefined');

// Now import the polyfill
try {
  await import('../fetch-polyfill.js');
  console.log('✅ Polyfill imported successfully');
  console.log('Fetch after polyfill:', typeof fetch !== 'undefined');

  if (typeof fetch === 'undefined') {
    console.error('❌ Polyfill failed to install fetch');
    process.exit(1);
  }

  // Test that fetch works
  console.log('\nTesting fetch...');
  const response = await fetch('https://unpkg.com/use-m/package.json');
  const data = await response.json();
  console.log('✅ Fetch works! Package name:', data.name);

  // Now test loading use-m
  console.log('\nTesting use-m...');
  const { use } = eval(await (await fetch('https://unpkg.com/use-m/use.js')).text());
  console.log('✅ use-m loaded successfully');

  const _ = await use('lodash@4.17.21');
  console.log('✅ lodash loaded successfully');
  console.log('Test: _.add(1, 2) =', _.add(1, 2));

  console.log('\n🎉 All tests passed!');
} catch (error) {
  console.error('❌ Test failed:', error.message);
  console.error(error.stack);

  // Restore original fetch
  if (originalFetch) {
    globalThis.fetch = originalFetch;
  }

  process.exit(1);
}
