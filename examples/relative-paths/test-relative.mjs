import { use } from '../../use.mjs';

console.log('Testing relative path resolver...\n');

try {
  // Test importing a file from the same directory
  console.log('1. Testing ./helper.mjs');
  const helper = await use('./helper.mjs');
  console.log('   ✓ Successfully imported helper:', helper.message);
  
  // Test importing from a subdirectory  
  console.log('\n2. Testing ./subfolder/deep.mjs');
  const deep = await use('./subfolder/deep.mjs');
  console.log('   ✓ Successfully imported from subdirectory:', deep.message, '(depth:', deep.depth + ')');
  
  // Test importing from parent directory (go up one level)
  console.log('\n3. Testing ../relative-paths/helper.mjs');
  const parentHelper = await use('../relative-paths/helper.mjs');
  console.log('   ✓ Successfully imported from parent directory:', parentHelper.message);
  
  // Test importing from two levels up
  console.log('\n4. Testing ../../use.mjs');
  const useModule = await use('../../use.mjs');
  console.log('   ✓ Successfully imported use.mjs:', typeof useModule.use === 'function' ? 'use function found' : 'module loaded');
  
  console.log('\n✅ All relative path tests passed!');
} catch (error) {
  console.error('❌ Test failed:', error.message);
  console.error(error);
}