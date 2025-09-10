#!/usr/bin/env node

// Demo script showing the in-memory cache functionality of use-m
// This script demonstrates that modules are cached and the same instance is returned

const { use } = eval(
  await fetch('https://unpkg.com/use-m/use.js').then(u => u.text())
);

console.log('🚀 use-m cache demonstration\n');

// First, let's test with a built-in module
console.log('1. Testing built-in module caching:');
const crypto1 = await use('crypto');
const crypto2 = await use('crypto');

console.log(`crypto1 === crypto2: ${crypto1 === crypto2} (should be true - cached!)`);
console.log(`crypto hash test: ${crypto1.createHash('sha256').update('test').digest('hex')}\n`);

// Now test with an NPM module
console.log('2. Testing npm module caching:');
console.log('Loading lodash first time...');
const start1 = performance.now();
const lodash1 = await use('lodash@4.17.21');
const time1 = performance.now() - start1;

console.log('Loading lodash second time...');
const start2 = performance.now();
const lodash2 = await use('lodash@4.17.21');
const time2 = performance.now() - start2;

console.log(`lodash1 === lodash2: ${lodash1 === lodash2} (should be true - cached!)`);
console.log(`First load time: ${time1.toFixed(2)}ms`);
console.log(`Second load time: ${time2.toFixed(2)}ms (should be much faster!)`);
console.log(`Speed improvement: ${((time1 - time2) / time1 * 100).toFixed(1)}%\n`);

// Test functionality still works
console.log('3. Testing functionality:');
console.log(`lodash1.add(1, 2) = ${lodash1.add(1, 2)}`);
console.log(`lodash2.add(3, 4) = ${lodash2.add(3, 4)}`);

console.log('\n✅ Cache demo complete! Modules are cached in memory for better performance.');