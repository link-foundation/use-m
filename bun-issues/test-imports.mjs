// Comprehensive test showing the differences between libraries with and without exports (MJS environment)
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create require that can resolve local packages
const require = createRequire(import.meta.url);

console.log('=== COMPREHENSIVE IMPORT TEST (MJS Environment) ===');
console.log();

console.log('--- LIBRARY WITH EXPLICIT EXPORTS (workaround - all files exported) ---');
const withExportsTests = [
  'library-with-exports/test.js',    // ✅ Should work (exported)
  'library-with-exports/test.cjs',   // ✅ Should work (explicitly exported - workaround)
  'library-with-exports/test.mjs',   // ✅ Should work (explicitly exported - workaround)
  'library-with-exports/package.json' // ✅ Should work (explicitly exported - workaround)
];

for (const testPath of withExportsTests) {
  try {
    console.log(`require("${testPath}")`);
    const result = require(testPath);
    console.log('✅ SUCCESS');
    if (result.testJs) console.log('  Function:', result.testJs());
    if (result.testCjs) console.log('  Function:', result.testCjs());
    if (result.testMjs) console.log('  Function:', result.testMjs());
    if (result.data) console.log('  Data:', result.data);
    if (result.name) console.log('  Package name:', result.name);
  } catch (error) {
    console.log('❌ BLOCKED');
    if (error.message.includes('Package subpath')) {
      console.log('  Error type: Node.js detailed exports validation');
    } else if (error.message.includes('Cannot find module')) {
      console.log('  Error type: Bun generic module not found');
    } else {
      console.log('  Error:', error.message.substring(0, 50));
    }
  }
  console.log();
}

console.log('--- LIBRARY WITH LIMITED EXPORTS (only . defined - should show bug) ---');
const limitedExportsTests = [
  'library-limited-exports/test.js',
  'library-limited-exports/test.cjs', 
  'library-limited-exports/test.mjs',
  'library-limited-exports/package.json'
];

for (const testPath of limitedExportsTests) {
  try {
    console.log(`require("${testPath}")`);
    const result = require(testPath);
    console.log('✅ SUCCESS');
    if (result.testJs) console.log('  Function:', result.testJs());
    if (result.testCjs) console.log('  Function:', result.testCjs());
    if (result.testMjs) console.log('  Function:', result.testMjs());
    if (result.data) console.log('  Data:', result.data);
    if (result.name) console.log('  Package name:', result.name);
  } catch (error) {
    console.log('❌ BLOCKED');
    if (error.message.includes('Package subpath')) {
      console.log('  Error type: Node.js detailed exports validation');
    } else if (error.message.includes('Cannot find module')) {
      console.log('  Error type: Bun generic module not found');
    } else {
      console.log('  Error:', error.message.substring(0, 50));
    }
  }
  console.log();
}

console.log('--- LIBRARY WITHOUT EXPORTS (all should work) ---');
const withoutExportsTests = [
  'library-without-exports/test.js',
  'library-without-exports/test.cjs', 
  'library-without-exports/test.mjs',
  'library-without-exports/package.json'
];

for (const testPath of withoutExportsTests) {
  try {
    console.log(`require("${testPath}")`);
    const result = require(testPath);
    console.log('✅ SUCCESS');
    if (result.testJs) console.log('  Function:', result.testJs());
    if (result.testCjs) console.log('  Function:', result.testCjs());
    if (result.testMjs) console.log('  Function:', result.testMjs());
    if (result.data) console.log('  Data:', result.data);
    if (result.name) console.log('  Package name:', result.name);
  } catch (error) {
    console.log('❌ BLOCKED');
    console.log('  Error:', error.message.substring(0, 60));
  }
  console.log();
}

console.log('=== END TEST ===');