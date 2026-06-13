import { readFileSync } from 'node:fs';
import { loadUseM } from '../load.mjs';

const realUseJs = readFileSync(new URL('../use.js', import.meta.url), 'utf8');
const fetch = async () => ({ ok: true, status: 200, statusText: 'OK', text: async () => realUseJs });

const mod = await loadUseM({ fetch, retryDelayMs: 0 });
console.log('[mjs real eval] has use:', typeof mod.use === 'function');
console.log('[mjs real eval] has use.all:', typeof mod.use.all === 'function');
console.log('[mjs real eval] has resolvers:', typeof mod.resolvers === 'object');
