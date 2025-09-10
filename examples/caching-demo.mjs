#!/usr/bin/env node

// Demonstration of the new caching functionality for non-specific versions

import { use } from '../use.mjs';
import { promises as fs } from 'fs';
import { tmpdir } from 'os';
import path from 'path';

const getCacheFile = async (packageName, version) => {
  const cacheDir = path.join(tmpdir(), 'use-m-cache');
  const cacheKey = `${packageName.replace('@', '').replace('/', '-')}-${version}`;
  const cachePath = path.join(cacheDir, `${cacheKey}.json`);
  try {
    const data = await fs.readFile(cachePath, 'utf8');
    return JSON.parse(data);
  } catch {
    return null;
  }
};

console.log('=== Use-m Caching Demo ===\n');

console.log('1. First call to lodash@latest (this will fetch from npm and cache the result):');
const start1 = Date.now();
const _ = await use('lodash@latest');
const end1 = Date.now();
console.log(`   Time taken: ${end1 - start1}ms`);
console.log(`   Lodash version works: ${_.VERSION}`);

const cacheData = await getCacheFile('lodash', 'latest');
if (cacheData) {
  console.log(`   ✓ Cache created: resolved version ${cacheData.resolvedVersion}`);
  console.log(`   ✓ Cache timestamp: ${new Date(cacheData.timestamp).toISOString()}`);
} else {
  console.log('   ✗ Cache was not created');
}

console.log('\n2. Second call to lodash@latest (this should use cached version and be faster):');
const start2 = Date.now();
const _2 = await use('lodash@latest');
const end2 = Date.now();
console.log(`   Time taken: ${end2 - start2}ms`);
console.log(`   Same lodash version: ${_2.VERSION}`);

const cacheData2 = await getCacheFile('lodash', 'latest');
if (cacheData2 && cacheData && cacheData2.timestamp === cacheData.timestamp) {
  console.log(`   ✓ Cache was reused (timestamp unchanged)`);
} else {
  console.log('   ✗ Cache was not reused');
}

console.log('\n3. Specific version like lodash@4.17.21 (this should NOT be cached):');
const start3 = Date.now();
const _3 = await use('lodash@4.17.21');
const end3 = Date.now();
console.log(`   Time taken: ${end3 - start3}ms`);
console.log(`   Lodash version: ${_3.VERSION}`);

const cacheData3 = await getCacheFile('lodash', '4.17.21');
if (!cacheData3) {
  console.log(`   ✓ Specific version was NOT cached (as expected)`);
} else {
  console.log('   ✗ Specific version was cached (unexpected)');
}

console.log('\n=== Summary ===');
console.log('- Latest versions (like @latest) are now cached for 5 minutes by default');
console.log('- Specific versions (like @4.17.21) are not cached');
console.log('- This solves the issue where @latest would be fetched every time');
console.log('- Future versions can extend caching to major version ranges like @4');

console.log('\nDemonstration complete! 🎉');