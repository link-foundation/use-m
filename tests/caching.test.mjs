import { describe, test, expect } from '../test-adapter.mjs';
import { use } from 'use-m';
import { promises as fs } from 'fs';
import { tmpdir } from 'os';
import path from 'path';

const moduleName = `[${import.meta.url.split('.').pop()} module]`;

// Helper to clean cache directory
const cleanCache = async () => {
  try {
    const cacheDir = path.join(tmpdir(), 'use-m-cache');
    await fs.rmdir(cacheDir, { recursive: true });
  } catch (error) {
    // Ignore if cache dir doesn't exist
  }
};

// Helper to check if cache file exists
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

describe(`${moduleName} Version caching functionality`, () => {
  test(`${moduleName} Should cache latest version resolution`, async () => {
    // Clean cache before test
    await cleanCache();
    
    // First call should create cache
    const _ = await use('lodash@latest');
    
    // Check that cache file was created
    const cacheData = await getCacheFile('lodash', 'latest');
    expect(cacheData).toBeTruthy();
    expect(cacheData.packageName).toBe('lodash');
    expect(cacheData.requestedVersion).toBe('latest');
    expect(cacheData.resolvedVersion).toMatch(/^\d+\.\d+\.\d+$/);
    expect(typeof cacheData.timestamp).toBe('number');
    
    // Verify lodash works
    expect(_.add(1, 2)).toBe(3);
  });

  test(`${moduleName} Should use cached latest version on subsequent calls`, async () => {
    // Clean cache before test
    await cleanCache();
    
    // First call to cache the version
    await use('lodash@latest');
    const firstCacheData = await getCacheFile('lodash', 'latest');
    
    // Wait a small amount to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));
    
    // Second call should use cached version
    await use('lodash@latest');
    const secondCacheData = await getCacheFile('lodash', 'latest');
    
    // Cache timestamp should not have changed
    expect(secondCacheData.timestamp).toBe(firstCacheData.timestamp);
    expect(secondCacheData.resolvedVersion).toBe(firstCacheData.resolvedVersion);
  }, 10000);

  test(`${moduleName} Should not cache specific versions`, async () => {
    // Clean cache before test
    await cleanCache();
    
    // Use a specific version
    await use('lodash@4.17.21');
    
    // Check that no cache file was created
    const cacheData = await getCacheFile('lodash', '4.17.21');
    expect(cacheData).toBeNull();
  });

  test(`${moduleName} Should cache latest version`, async () => {
    // Clean cache before test  
    await cleanCache();
    
    // Use latest version
    await use('lodash@latest');
    
    // Check that cache file was created
    const cacheData = await getCacheFile('lodash', 'latest');
    expect(cacheData).toBeTruthy();
    expect(cacheData.packageName).toBe('lodash');
    expect(cacheData.requestedVersion).toBe('latest');
    expect(cacheData.resolvedVersion).toMatch(/^\d+\.\d+\.\d+$/);
  });

  test(`${moduleName} Should expire cache after timeout`, async () => {
    // This is a conceptual test - in practice, we'd need to mock Date.now()
    // or set a very short timeout to test expiration without waiting 5 minutes
    
    // Clean cache before test
    await cleanCache();
    
    // Use a package with latest version (which gets cached)
    await use('lodash@latest');
    const cacheData = await getCacheFile('lodash', 'latest');
    expect(cacheData).toBeTruthy();
    
    // Manually modify cache timestamp to simulate expiration
    const expiredCacheData = {
      ...cacheData,
      timestamp: Date.now() - (6 * 60 * 1000) // 6 minutes ago
    };
    
    const cacheDir = path.join(tmpdir(), 'use-m-cache');
    const cacheKey = 'lodash-latest';
    const cachePath = path.join(cacheDir, `${cacheKey}.json`);
    await fs.writeFile(cachePath, JSON.stringify(expiredCacheData), 'utf8');
    
    // Now use the package again - should refresh the cache
    await use('lodash@latest');
    const refreshedCacheData = await getCacheFile('lodash', 'latest');
    
    // Timestamp should be updated
    expect(refreshedCacheData.timestamp).toBeGreaterThan(expiredCacheData.timestamp);
  });
});