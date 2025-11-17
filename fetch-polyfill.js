/**
 * Fetch polyfill for Node.js environments where fetch is not available
 *
 * This addresses issue #45 where fetch is not defined in certain Windows contexts
 * (e.g., Git Bash, shebang execution) even in Node.js 18+.
 *
 * Usage:
 *   // Ensure fetch is available before loading use-m
 *   await import('use-m/fetch-polyfill.js');
 *   const { use } = eval(await (await fetch('https://unpkg.com/use-m/use.js')).text());
 *
 * Or with a local import:
 *   await import('./fetch-polyfill.js');
 */

// Only install polyfill if fetch is not already available
const needsPolyfill = typeof globalThis !== 'undefined' && typeof globalThis.fetch === 'undefined';

if (needsPolyfill) {
  // Create a minimal fetch implementation using node:http/https
  const installPolyfill = async () => {
    try {
      // First, try to import from undici (Node.js 18+)
      let fetchImpl;

      try {
        const undici = await import('undici');
        fetchImpl = undici.fetch;
      } catch {
        // If undici is not available, create a minimal fetch using node:http/https
        const https = await import('node:https');
        const http = await import('node:http');
        const { URL } = await import('node:url');

        fetchImpl = (url, options = {}, redirectCount = 0) => {
          const MAX_REDIRECTS = 20;

          return new Promise((resolve, reject) => {
            const parsedUrl = new URL(url);
            const protocol = parsedUrl.protocol === 'https:' ? https : http;

            const requestOptions = {
              method: options.method || 'GET',
              headers: options.headers || {},
            };

            const req = protocol.request(parsedUrl, requestOptions, (res) => {
              // Handle redirects (301, 302, 303, 307, 308)
              if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                if (redirectCount >= MAX_REDIRECTS) {
                  return reject(new Error('Too many redirects'));
                }

                const redirectUrl = new URL(res.headers.location, url).href;
                return resolve(fetchImpl(redirectUrl, options, redirectCount + 1));
              }

              const chunks = [];

              res.on('data', chunk => chunks.push(chunk));

              res.on('end', () => {
                const buffer = Buffer.concat(chunks);
                const text = buffer.toString('utf-8');

                resolve({
                  ok: res.statusCode >= 200 && res.statusCode < 300,
                  status: res.statusCode,
                  statusText: res.statusMessage,
                  headers: res.headers,
                  url: url,
                  redirected: redirectCount > 0,
                  type: 'basic',
                  text: () => Promise.resolve(text),
                  json: () => Promise.resolve(JSON.parse(text)),
                  blob: () => Promise.resolve(buffer),
                  arrayBuffer: () => Promise.resolve(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)),
                });
              });
            });

            req.on('error', reject);

            if (options.body) {
              req.write(options.body);
            }

            req.end();
          });
        };
      }

      // Install fetch polyfill globally
      globalThis.fetch = fetchImpl;
    } catch (error) {
      // If polyfill installation fails, provide a helpful error message
      console.error('Failed to install fetch polyfill:', error.message);
      console.error('Please ensure you are running Node.js 18+ or install node-fetch manually.');
    }
  };

  // Execute the polyfill installation
  await installPolyfill();
}

// Export the fetch function (either native or polyfilled)
export const fetch = globalThis.fetch;
export default globalThis.fetch;
