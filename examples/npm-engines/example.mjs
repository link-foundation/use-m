// Run with Node.js 20 or later: node examples/npm-engines/example.mjs
import { makeUse } from '../../use.mjs';

// Automatic versions stay within ^11 and support the running Node version.
// Debug output explains a fallback when a newer release requires newer Node.
const use = await makeUse({ debug: 1 });
const { LRUCache } = await use('lru-cache@^11');
const cache = new LRUCache({ max: 10 });
cache.set('message', 'Loaded a Node-compatible release');
console.log(cache.get('message'));

// Explicit opt-out when you want npm's usual engine-warning behavior:
// await use('lru-cache', { engineStrict: false });
