#!/usr/bin/env node

/**
 * Test script to reproduce issue #47: Cannot import sub-paths like 'yargs/helpers'
 *
 * This script tests importing yargs/helpers to verify the exports field handling.
 */

console.log('Testing yargs with use-m...\n');

// Import use-m from the local source
import { use } from '../use.mjs';

try {
  console.log('1. Testing yargs main import...');
  const yargs = await use('yargs');
  console.log('✓ yargs imported successfully');
  console.log('  Type:', typeof yargs);
} catch (error) {
  console.error('✗ Failed to import yargs:', error.message);
  console.error('  Stack:', error.stack);
  process.exit(1);
}

try {
  console.log('\n2. Testing yargs/helpers import...');
  const helpers = await use('yargs/helpers');
  console.log('✓ yargs/helpers imported successfully');
  console.log('  Type:', typeof helpers);
  console.log('  Has hideBin:', 'hideBin' in helpers);

  // Test hideBin function
  if (helpers.hideBin) {
    const testArgs = ['node', 'script.js', 'arg1', 'arg2'];
    const result = helpers.hideBin(testArgs);
    console.log('  hideBin test:', JSON.stringify(result));
  }
} catch (error) {
  console.error('✗ Failed to import yargs/helpers:', error.message);
  console.error('  Stack:', error.stack);
  process.exit(1);
}

console.log('\n✅ All imports successful!');
