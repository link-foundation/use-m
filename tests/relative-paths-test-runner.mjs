import { use } from '../use.mjs';

console.log('Testing relative paths from tests directory...\n');

try {
  // Test 1: Import JS file from same directory
  console.log('1. Testing ./browser-server/test-helper.js');
  const testModule = await use('./browser-server/test-helper.js');
  console.log('   ✓ Message:', testModule.message);
  
  // Test 2: Import JSON file from same directory  
  console.log('\n2. Testing ./browser-server/test-data.json');
  const testData = await use('./browser-server/test-data.json');
  console.log('   ✓ Value:', testData.value);
  console.log('   ✓ Test:', testData.test);
  
  // Test 3: Import from parent directory
  console.log('\n3. Testing ../use.mjs');
  const parentModule = await use('../use.mjs');
  console.log('   ✓ use function exists:', typeof parentModule.use === 'function');
  
  // Test 4: Import from subdirectory
  console.log('\n4. Testing ./browser-server/subfolder/nested.js');
  const subModule = await use('./browser-server/subfolder/nested.js');
  console.log('   ✓ Nested:', subModule.nested, 'Level:', subModule.level);
  
  // Test 5: Import JSON from subdirectory
  console.log('\n5. Testing ./browser-server/subfolder/nested-data.json');
  const subData = await use('./browser-server/subfolder/nested-data.json');
  console.log('   ✓ Level:', subData.level, 'Depth:', subData.depth);
  
  // Test 6: Complex relative path 
  console.log('\n6. Testing ../package.json');
  const rootData = await use('../package.json');
  console.log('   ✓ Package name:', rootData.name);
  
  console.log('\n✅ All direct tests passed!');
} catch (error) {
  console.error('❌ Test failed:', error.message);
  console.error(error.stack);
  process.exit(1);
}