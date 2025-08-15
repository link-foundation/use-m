// Test the difference between main module import vs subpath import
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

console.log('=== TESTING MAIN VS SUBPATH ACCESS ===');
console.log();

console.log('Testing library-limited-exports (only "." defined):');
console.log();

// Test 1: Main module access (should work - "." is defined)
console.log('1. Main module access:');
try {
  console.log('require("library-limited-exports")');
  const result = require('library-limited-exports');
  console.log('✅ SUCCESS - Main module imported');
  if (result.testMjs) console.log('  Function:', result.testMjs());
  if (result.testCjs) console.log('  Function:', result.testCjs());
  if (result.data) console.log('  Data:', result.data);
} catch (error) {
  console.log('❌ FAILED');
  console.log('  Error:', error.message.substring(0, 80));
}
console.log();

// Test 2: Subpath access (should fail - not exported)
console.log('2. Subpath access:');
const subpaths = [
  'library-limited-exports/test.js',
  'library-limited-exports/test.cjs', 
  'library-limited-exports/test.mjs',
  'library-limited-exports/package.json'
];

for (const subpath of subpaths) {
  try {
    console.log(`require("${subpath}")`);
    const result = require(subpath);
    console.log('✅ SUCCESS (This might be the bug!)');
    if (result.name) console.log('  Package name:', result.name);
  } catch (error) {
    console.log('❌ BLOCKED (correct behavior)');
    if (error.message.includes('Package subpath')) {
      console.log('  Node.js: Proper exports validation');
    } else {
      console.log('  Bun: Generic error');
    }
  }
  console.log();
}