import { use } from '../../use.mjs';

console.log('🧪 Comprehensive relative path test...\n');

const tests = [
  {
    name: 'Same directory (./) - helper.mjs',
    specifier: './helper.mjs',
    expected: 'Hello from helper module!'
  },
  {
    name: 'Subdirectory (./) - subfolder/deep.mjs',
    specifier: './subfolder/deep.mjs',
    expected: 'Hello from deep module!'
  },
  {
    name: 'Parent directory (../) - ../relative-paths/helper.mjs',
    specifier: '../relative-paths/helper.mjs',
    expected: 'Hello from helper module!'
  },
  {
    name: 'Two levels up (../../) - ../../use.mjs',
    specifier: '../../use.mjs',
    expected: 'use function found'
  }
];

let passed = 0;
let total = tests.length;

for (const [index, test] of tests.entries()) {
  try {
    console.log(`${index + 1}. ${test.name}`);
    const module = await use(test.specifier);
    
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
  } catch (error) {
    console.log(`   ❌ ERROR: ${error.message}`);
  }
  console.log();
}

console.log(`📊 Results: ${passed}/${total} tests passed`);
if (passed === total) {
  console.log('🎉 All relative path tests passed!');
} else {
  console.log('⚠️  Some tests failed');
  process.exit(1);
}