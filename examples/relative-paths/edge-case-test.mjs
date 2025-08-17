import { use } from '../../use.mjs';

console.log('🔍 Edge case relative path test...\n');

const tests = [
  {
    name: 'Three levels up (../../../)',
    specifier: '../../../use.mjs',  // Should fail - goes above the repo
    shouldFail: true
  },
  {
    name: 'Self reference (../../examples/relative-paths/helper.mjs)',
    specifier: '../../examples/relative-paths/helper.mjs',
    expected: 'Hello from helper module!'
  },
  {
    name: 'Deep subdirectory with parent (.././subfolder/deep.mjs)',
    specifier: '.././subfolder/deep.mjs',
    expected: 'Hello from deep module!'
  }
];

let passed = 0;
let total = tests.length;

for (const [index, test] of tests.entries()) {
  try {
    console.log(`${index + 1}. ${test.name}`);
    const module = await use(test.specifier);
    
    if (test.shouldFail) {
      console.log(`   ❌ FAILED: Expected error but import succeeded`);
    } else {
      let result;
      if (test.specifier.includes('use.mjs')) {
        result = typeof module.use === 'function' ? 'use function found' : 'module loaded';
      } else {
        result = module.message || module.default?.message || 'unknown';
      }
      
      if (result === test.expected) {
        console.log(`   ✅ SUCCESS: ${result}`);
        passed++;
      } else {
        console.log(`   ❌ FAILED: Expected "${test.expected}", got "${result}"`);
      }
    }
  } catch (error) {
    if (test.shouldFail) {
      console.log(`   ✅ SUCCESS: Expected error - ${error.message}`);
      passed++;
    } else {
      console.log(`   ❌ ERROR: ${error.message}`);
    }
  }
  console.log();
}

console.log(`📊 Results: ${passed}/${total} tests passed`);
if (passed === total) {
  console.log('🎉 All edge case tests passed!');
} else {
  console.log('⚠️  Some tests failed');
}