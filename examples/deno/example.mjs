// Deno example showing use-m working with Deno runtime
// From the repository root: deno run --allow-net examples/deno/example.mjs

// Load use-m through Deno's npm compatibility layer so the native npm fallback is available.
import { use } from 'npm:use-m';

console.log('🦕 Testing use-m with Deno...');

try {
  // Test basic package import
  console.log('📦 Importing lodash...');
  const _ = await use('lodash@4.17.21');
  const result = _.add(1, 2);
  console.log(`✅ _.add(1, 2) = ${result}`);
  
  // Test scoped package
  console.log('📦 Importing @octokit/core...');
  const { Octokit } = await use('@octokit/core@6.1.5');
  const octokit = new Octokit();
  console.log('✅ Octokit instance created successfully');
  
  // Test use.all for multiple packages
  console.log('📦 Importing multiple packages...');
  const [lodash3, lodash4] = await use.all('lodash@3.10.1', 'lodash@4.17.21');
  console.log(`✅ Multiple versions: lodash3.add(1,2)=${lodash3.add(1,2)}, lodash4.add(1,2)=${lodash4.add(1,2)}`);
  
  console.log('🎉 All tests passed! Deno support is working correctly.');
} catch (error) {
  console.error('❌ Error:', error.message);
  Deno.exit(1);
}
