import { readFileSync } from 'node:fs';
import { loadUseM, looksLikeUseModule, DEFAULT_SOURCES } from '../src/load.mjs';

// 1) Validation against the real use.js and against error bodies.
const realUseJs = readFileSync(new URL('../src/use.js', import.meta.url), 'utf8');
console.log('looksLikeUseModule(real use.js):', looksLikeUseModule(realUseJs)); // expect true
console.log('looksLikeUseModule("Internal Server Error"):', looksLikeUseModule('Internal Server Error')); // false
console.log('looksLikeUseModule("Bad Gateway"):', looksLikeUseModule('Bad Gateway')); // false
console.log('looksLikeUseModule("<!DOCTYPE html>..."):', looksLikeUseModule('<!DOCTYPE html><html><body>502</body></html>')); // false
console.log('looksLikeUseModule(""):', looksLikeUseModule('')); // false
console.log('DEFAULT_SOURCES:', DEFAULT_SOURCES);

// Helper to build a fake Response.
const res = (body, { ok = true, status = 200, statusText = 'OK' } = {}) => ({
  ok, status, statusText, text: async () => body,
});

const FAKE_MODULE = '/* ' + 'x'.repeat(300) + ' */\n(() => ({ use: function use(){ return "fake-use"; }, all(){} }))()';

// 2) Success on first source.
{
  const calls = [];
  const fetch = async (url) => { calls.push(url); return res(FAKE_MODULE); };
  const mod = await loadUseM({ fetch, retryDelayMs: 0 });
  console.log('\n[success first source] use is fn:', typeof mod.use === 'function', '| calls:', calls.length);
}

// 3) First two sources fail with error bodies, third succeeds -> fallback works, no SyntaxError.
{
  const calls = [];
  const fetch = async (url) => {
    calls.push(url);
    if (url.includes('unpkg')) return res('Internal Server Error');           // short error body
    if (url.includes('jsdelivr')) return res('Bad Gateway', { ok: false, status: 502, statusText: 'Bad Gateway' });
    return res(FAKE_MODULE);                                                   // esm.sh ok
  };
  const mod = await loadUseM({ fetch, retryDelayMs: 0 });
  console.log('[fallback] use is fn:', typeof mod.use === 'function', '| total fetch calls:', calls.length);
}

// 4) All sources return error bodies -> clear aggregated error (NOT SyntaxError).
{
  const fetch = async () => res('Internal Server Error');
  try {
    await loadUseM({ fetch, retryDelayMs: 0, maxAttemptsPerSource: 2 });
    console.log('[all-fail] ERROR: should have thrown');
  } catch (e) {
    console.log('\n[all-fail] errorType:', e.constructor.name, '(expect Error, not SyntaxError)');
    console.log('[all-fail] message starts with:', JSON.stringify(e.message.split('\n')[0]));
    console.log('[all-fail] lists attempts:', e.message.includes('attempt 1/2') && e.message.includes('attempt 2/2'));
    console.log('[all-fail] mentions all 3 mirrors:', ['unpkg','jsdelivr','esm.sh'].every(m => e.message.includes(m)));
  }
}

// 5) eval of a garbage-but-long body is caught (no SyntaxError escapes).
{
  const garbage = '/* ' + 'a '.repeat(150) + '*/ use Server Error ((( ';  // passes looksLike, invalid JS
  const fetch = async () => res(garbage);
  try {
    await loadUseM({ fetch, retryDelayMs: 0, maxAttemptsPerSource: 1, sources: ['https://unpkg.com/use-m/src/use.js'] });
    console.log('[eval-garbage] ERROR: should have thrown');
  } catch (e) {
    console.log('[eval-garbage] errorType:', e.constructor.name, '(expect Error, not SyntaxError)');
  }
}
