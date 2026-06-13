const { readFileSync } = require('node:fs');
const path = require('node:path');
const { loadUseM, looksLikeUseModule, DEFAULT_SOURCES } = require('../load.cjs');

(async () => {
  const realUseJs = readFileSync(path.join(__dirname, '..', 'use.js'), 'utf8');
  console.log('[cjs] looksLikeUseModule(real):', looksLikeUseModule(realUseJs));
  console.log('[cjs] looksLikeUseModule("Not Found"):', looksLikeUseModule('Not Found'));
  console.log('[cjs] DEFAULT_SOURCES length:', DEFAULT_SOURCES.length);
  const fetch = async () => ({ ok: true, status: 200, statusText: 'OK', text: async () => realUseJs });
  const mod = await loadUseM({ fetch, retryDelayMs: 0 });
  console.log('[cjs real eval] has use:', typeof mod.use === 'function');

  // all-fail clear error
  try {
    await loadUseM({ fetch: async () => ({ ok: false, status: 503, statusText: 'Service Unavailable', text: async () => 'Service Unavailable' }), retryDelayMs: 0, maxAttemptsPerSource: 1 });
  } catch (e) {
    console.log('[cjs all-fail] type:', e.constructor.name, '| has HTTP 503:', e.message.includes('HTTP 503'));
  }
})();
