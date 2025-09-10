#!/usr/bin/env node

import { makeUse } from '../use.mjs';

// Create a use function with yarn resolver
const use = await makeUse({
  specifierResolver: 'yarn'
});

console.log('🧶 Testing yarn resolver functionality...\n');

try {
  console.log('1. Testing basic package resolution with lodash@4.17.21');
  const lodash = await use('lodash@4.17.21');
  console.log(`   ✅ Success! Lodash version: ${lodash.VERSION}`);
  console.log(`   📦 Package has ${Object.keys(lodash).length} exports\n`);
  
  console.log('2. Testing scoped package resolution with @octokit/core@latest');
  const octokitCore = await use('@octokit/core@latest');
  console.log(`   ✅ Success! Octokit Core loaded`);
  console.log(`   📦 Octokit class available: ${typeof octokitCore.Octokit === 'function'}\n`);

  console.log('3. Testing subpath resolution with yargs@17.7.2/helpers');
  const yargHelpers = await use('yargs@17.7.2/helpers');
  console.log(`   ✅ Success! Yargs helpers loaded`);
  console.log(`   📦 hideBin function available: ${typeof yargHelpers.hideBin === 'function'}\n`);

  console.log('🎉 All yarn resolver tests passed! The yarn resolver is working correctly.');
  
} catch (error) {
  console.error('❌ Error testing yarn resolver:', error.message);
  console.error('Full error:', error);
}