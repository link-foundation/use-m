#!/usr/bin/env node

/**
 * Test script demonstrating fetch polyfill for issue #45
 *
 * This shows how to ensure fetch is available before loading use-m
 */

console.log('=== Testing fetch polyfill approach ===');
console.log('Node version:', process.version);
console.log('Platform:', process.platform);
console.log('Initial fetch available:', typeof fetch !== 'undefined');

// Polyfill fetch if not available (for Node.js 18+ with Windows Git Bash issues)
if (typeof fetch === 'undefined') {
  console.log('\n⚠️  fetch is not defined, attempting to use node:http/https as fallback...');

  // For Node.js 18+, fetch should be available but might not be in certain contexts
  // We can try to explicitly import it from node:
  try {
    // Try to import fetch from Node.js built-ins (Node 18+)
    // This is a workaround for contexts where global fetch isn't initialized
    const { default: nodeFetch } = await import('node:http').then(() => {
      // Actually try to get fetch from the global after a tick
      return new Promise(resolve => {
        setImmediate(() => {
          if (typeof fetch !== 'undefined') {
            resolve({ default: fetch });
          } else {
            throw new Error('fetch still not available');
          }
        });
      });
    }).catch(async () => {
      // If Node.js built-in fetch is not available, fall back to https module
      const https = await import('node:https');
      const http = await import('node:http');

      return {
        default: (url, options = {}) => {
          return new Promise((resolve, reject) => {
            const parsedUrl = new URL(url);
            const protocol = parsedUrl.protocol === 'https:' ? https : http;

            const req = protocol.request(parsedUrl, {
              method: options.method || 'GET',
              headers: options.headers || {},
            }, (res) => {
              let data = '';
              res.on('data', chunk => data += chunk);
              res.on('end', () => {
                resolve({
                  ok: res.statusCode >= 200 && res.statusCode < 300,
                  status: res.statusCode,
                  statusText: res.statusMessage,
                  headers: res.headers,
                  text: () => Promise.resolve(data),
                  json: () => Promise.resolve(JSON.parse(data)),
                });
              });
            });

            req.on('error', reject);

            if (options.body) {
              req.write(options.body);
            }

            req.end();
          });
        }
      };
    });

    globalThis.fetch = nodeFetch;
    console.log('✅ fetch polyfill installed');
  } catch (error) {
    console.error('❌ Failed to install fetch polyfill:', error.message);
    process.exit(1);
  }
}

console.log('Final fetch available:', typeof fetch !== 'undefined');

// Now try to load use-m
try {
  console.log('\nLoading use-m...');
  const { use } = eval(await (await fetch('https://unpkg.com/use-m/use.js')).text());
  console.log('✅ Successfully loaded use-m');

  // Test using a package
  const _ = await use('lodash@4.17.21');
  console.log('✅ Successfully loaded lodash via use-m');
  console.log('Test: _.add(1, 2) =', _.add(1, 2));

  console.log('\n✅ All tests passed!');
} catch (error) {
  console.error('❌ Failed:', error.message);
  console.error(error.stack);
  process.exit(1);
}
