// Test that demonstrates the specific Bun bug with package.json access
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

console.log('=== SPECIFIC BUG DEMONSTRATION ===');
console.log('Creating a package with LIMITED exports (only test.js exported)');
console.log();

// First, let's temporarily modify library-with-exports to have limited exports
// and test the difference

// Test with current library-with-exports (all files exported - workaround)
console.log('--- CURRENT STATE: All files explicitly exported (workaround) ---');
const testPaths = [
  'library-with-exports/test.js',
  'library-with-exports/test.cjs', 
  'library-with-exports/test.mjs',
  'library-with-exports/package.json'
];

for (const testPath of testPaths) {
  try {
    console.log(`require("${testPath}")`);
    const result = require(testPath);
    console.log('✅ SUCCESS - workaround working');
  } catch (error) {
    console.log('❌ BLOCKED');
    if (error.message.includes('Package subpath')) {
      console.log('  Node.js: Detailed exports validation');
    } else {
      console.log('  Bun: Generic module not found');
    }
  }
}

console.log('\n--- TO SEE THE BUG: ---');
console.log('1. Remove "./test.cjs", "./test.mjs", "./package.json" from library-with-exports/package.json');
console.log('2. Re-run tests');
console.log('3. Node.js will block all unauthorized access');
console.log('4. Bun will INCORRECTLY allow package.json access');

console.log('\n=== END SPECIFIC BUG TEST ===');