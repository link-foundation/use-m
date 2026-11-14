#!/usr/bin/env node
// Reproduction for https://github.com/link-foundation/use-m/issues/80
//
// A loopback server sends HTTP 200 headers at once, then either never finishes
// the body (`/stalled-body`), never sends headers (`/stalled-headers`), or sends
// a complete self-authored module (`/complete`). `loadUseM` gets a 100 ms
// per-attempt timeout and one attempt; the script reports how each case settles
// within 400 ms and whether the fetch signal was aborted.
//
// Usage: node|bun|deno run -A experiments/issue-80/stalled-body.mjs [path/to/load.mjs]
import http from 'node:http';

const loadPath = process.argv[2] || new URL('../../src/load.mjs', import.meta.url).href;
const { loadUseM } = await import(loadPath.startsWith('file:') || loadPath.startsWith('http') ? loadPath : new URL(loadPath, `file://${process.cwd()}/`).href);

const MODULE = '/* ' + 'x'.repeat(300) + ' */\n(() => ({ use: function use() { return "ok"; } }))()';
const sockets = new Set();
const server = http.createServer((request, response) => {
  if (request.url === '/complete') {
    response.writeHead(200, { 'content-type': 'text/javascript' });
    response.end(MODULE);
  } else if (request.url === '/stalled-body') {
    response.writeHead(200, { 'content-type': 'text/javascript', 'content-length': String(MODULE.length) });
    response.write(MODULE.slice(0, 10)); // headers + a few bytes, then nothing
  }
  // '/stalled-headers': never respond at all
});
server.on('connection', (socket) => { sockets.add(socket); socket.on('close', () => sockets.delete(socket)); });
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`;

let failed = false;
for (const [path, expectation] of [['/complete', 'resolved'], ['/stalled-headers', 'rejected'], ['/stalled-body', 'rejected']]) {
  let aborted = false;
  const fetchSpy = (url, init) => {
    init?.signal?.addEventListener('abort', () => { aborted = true; });
    return fetch(url, init);
  };
  const started = Date.now();
  const outcome = await Promise.race([
    loadUseM({ fetch: fetchSpy, sources: [base + path], maxAttemptsPerSource: 1, timeoutMs: 100 })
      .then(() => 'resolved', (error) => `rejected (${error.message.split('\n').pop().trim()})`),
    new Promise((resolve) => setTimeout(() => resolve('pending after 400 ms'), 400)),
  ]);
  const ok = outcome.startsWith(expectation);
  failed ||= !ok;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${path}: ${outcome} in ${Date.now() - started} ms; signal aborted: ${aborted}`);
}

for (const socket of sockets) socket.destroy();
await new Promise((resolve) => server.close(resolve));
process.exit(failed ? 1 : 0);
