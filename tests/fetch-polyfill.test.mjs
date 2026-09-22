import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { fileURLToPath } from 'node:url'
import { describe, test, expect } from '../src/test-adapter.mjs'

const execFileAsync = promisify(execFile)
const repoRoot = fileURLToPath(new URL('..', import.meta.url))
const esmPolyfillUrl = new URL('../fetch-polyfill.js', import.meta.url).href
const cjsPolyfillPath = fileURLToPath(new URL('../fetch-polyfill.cjs', import.meta.url))
const fetchGlobals = [
  'fetch',
  'Headers',
  'Request',
  'Response',
  'FormData',
  'File',
  'Blob',
  'FileReader',
  'WebSocket',
  'CloseEvent',
  'ErrorEvent',
  'MessageEvent',
  'EventSource',
  'caches',
]
const fetchGlobalTypes = Object.fromEntries(
  fetchGlobals.map(name => [name, name === 'caches' ? 'object' : 'function'])
)

const runNode = async (source) => {
  let result
  try {
    result = await execFileAsync(
      'node',
      ['--no-warnings', '--input-type=module', '--eval', source],
      { cwd: repoRoot, maxBuffer: 1024 * 1024 }
    )
  } catch (error) {
    throw new Error(error.stderr || error.stdout || error.message, { cause: error })
  }
  const { stdout, stderr } = result
  if (stderr) {
    throw new Error(stderr)
  }
  return stdout.trim()
}

const clearFetchGlobals = `
  const fetchGlobals = ${JSON.stringify(fetchGlobals)};
  for (const name of fetchGlobals) {
    Object.defineProperty(globalThis, name, {
      configurable: true,
      value: undefined,
      writable: true,
    });
  }
`

describe('fetch polyfill', () => {
  test('installs the complete Web Fetch API when globals are missing', async () => {
    const output = await runNode(`
      ${clearFetchGlobals}
      const api = await import(${JSON.stringify(esmPolyfillUrl)});
      const types = Object.fromEntries(fetchGlobals.map(name => [name, typeof globalThis[name]]));
      const exportsMatch = fetchGlobals.every(name => api[name] === globalThis[name]);
      console.log(JSON.stringify({ types, exportsMatch, defaultMatches: api.default === globalThis.fetch }));
    `)

    expect(JSON.parse(output)).toEqual({
      types: fetchGlobalTypes,
      exportsMatch: true,
      defaultMatches: true,
    })
  })

  test('supports requests, responses, redirects, bodies, headers, cloning, and aborts', async () => {
    const output = await runNode(`
      ${clearFetchGlobals}
      await import(${JSON.stringify(esmPolyfillUrl)});
      const { createServer } = await import('node:http');
      const server = createServer(async (request, response) => {
        if (request.url === '/redirect') {
          response.writeHead(302, { location: '/json' });
          response.end();
          return;
        }
        if (request.url === '/slow') {
          setTimeout(() => response.end('late'), 250);
          return;
        }
        if (request.url === '/json') {
          response.writeHead(201, { 'content-type': 'application/json', 'x-test': 'yes' });
          response.end(JSON.stringify({ ok: true }));
          return;
        }
        const chunks = [];
        for await (const chunk of request) chunks.push(chunk);
        response.setHeader('content-type', 'application/json');
        response.end(JSON.stringify({
          body: Buffer.concat(chunks).toString(),
          header: request.headers['x-request'],
          method: request.method,
        }));
      });
      await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
      const base = 'http://127.0.0.1:' + server.address().port;
      try {
        const request = new Request(base + '/echo', {
          body: JSON.stringify({ sent: true }),
          headers: { 'content-type': 'application/json', 'x-request': 'present' },
          method: 'POST',
        });
        const echoResponse = await fetch(request);
        const echo = await echoResponse.json();

        const redirected = await fetch(base + '/redirect');
        const clone = redirected.clone();
        const json = await redirected.json();
        const cloneText = await clone.text();
        const blob = await new Response('blob-body').blob();
        const arrayBuffer = await new Response('bytes').arrayBuffer();

        const controller = new AbortController();
        const aborted = fetch(base + '/slow', { signal: controller.signal })
          .then(() => false, error => error.name === 'AbortError');
        controller.abort();

        console.log(JSON.stringify({
          aborted: await aborted,
          arrayBuffer: new TextDecoder().decode(arrayBuffer),
          blob: await blob.text(),
          cloneText,
          echo,
          header: clone.headers.get('x-test'),
          json,
          redirected: clone.redirected,
          status: clone.status,
        }));
      } finally {
        await new Promise(resolve => server.close(resolve));
      }
    `)

    expect(JSON.parse(output)).toEqual({
      aborted: true,
      arrayBuffer: 'bytes',
      blob: 'blob-body',
      cloneText: JSON.stringify({ ok: true }),
      echo: {
        body: JSON.stringify({ sent: true }),
        header: 'present',
        method: 'POST',
      },
      header: 'yes',
      json: { ok: true },
      redirected: true,
      status: 201,
    })
  })

  test('provides working implementations for every installed web global', async () => {
    const output = await runNode(`
      ${clearFetchGlobals}
      await import(${JSON.stringify(esmPolyfillUrl)});
      const { createHash } = await import('node:crypto');
      const { createServer } = await import('node:http');

      const headers = new Headers([['x-test', 'yes']]);
      const request = new Request('data:text/plain,request', {
        body: 'request-body',
        method: 'POST',
      });
      const response = new Response('response-body', { status: 202 });
      const blob = new Blob(['blob-body'], { type: 'text/plain' });
      const file = new File(['file-body'], 'file.txt', {
        lastModified: 123,
        type: 'text/plain',
      });
      const formData = new FormData();
      formData.append('field', 'value');
      formData.append('file', file);

      const fileReaderResult = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(reader.error);
        reader.readAsText(blob);
      });

      const closeEvent = new CloseEvent('close', {
        code: 1000,
        reason: 'done',
        wasClean: true,
      });
      const errorEvent = new ErrorEvent('error', {
        colno: 3,
        error: new Error('root cause'),
        filename: 'test.js',
        lineno: 2,
        message: 'broken',
      });
      const messageEvent = new MessageEvent('message', {
        data: { ok: true },
        origin: 'local',
      });

      const cacheName = 'use-m-fetch-polyfill-test';
      const cache = await caches.open(cacheName);
      await cache.put('http://localhost/item', new Response('cached'));
      const cached = await cache.match('http://localhost/item');
      const cacheResult = await cached.text();
      const cacheWasDeleted = await caches.delete(cacheName);

      const upgradedSockets = new Set();
      const server = createServer((incoming, outgoing) => {
        if (incoming.url === '/events') {
          outgoing.writeHead(200, {
            'cache-control': 'no-cache',
            'content-type': 'text/event-stream',
          });
          outgoing.end('event: update\\ndata: event-data\\n\\n');
          return;
        }
        outgoing.writeHead(404);
        outgoing.end();
      });
      server.on('upgrade', (incoming, socket) => {
        upgradedSockets.add(socket);
        socket.once('close', () => upgradedSockets.delete(socket));
        const accept = createHash('sha1')
          .update(incoming.headers['sec-websocket-key'] + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11')
          .digest('base64');
        socket.write([
          'HTTP/1.1 101 Switching Protocols',
          'Upgrade: websocket',
          'Connection: Upgrade',
          'Sec-WebSocket-Accept: ' + accept,
          '',
          '',
        ].join('\\r\\n'));
        const payload = Buffer.from('websocket-data');
        socket.write(Buffer.concat([Buffer.from([0x81, payload.length]), payload]));
        setTimeout(() => socket.end(), 20);
      });
      await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
      const base = 'http://127.0.0.1:' + server.address().port;
      try {
        const eventSourceResult = await new Promise((resolve, reject) => {
          const events = new EventSource(base + '/events');
          events.addEventListener('update', event => {
            events.close();
            resolve(event.data);
          }, { once: true });
          events.onerror = () => {
            events.close();
            reject(new Error('EventSource failed'));
          };
        });
        const webSocketResult = await new Promise((resolve, reject) => {
          const socket = new WebSocket(base.replace('http:', 'ws:') + '/socket');
          socket.onmessage = event => {
            socket.close();
            resolve(event.data);
          };
          socket.onerror = () => reject(new Error('WebSocket failed'));
        });

        console.log(JSON.stringify({
          blob: [blob.type, await blob.text()],
          cache: [cacheResult, cacheWasDeleted],
          closeEvent: [closeEvent.code, closeEvent.reason, closeEvent.wasClean],
          errorEvent: [errorEvent.message, errorEvent.filename, errorEvent.lineno, errorEvent.colno],
          eventSource: eventSourceResult,
          file: [file.name, file.type, file.lastModified, await file.text()],
          fileReader: fileReaderResult,
          formData: [formData.get('field'), formData.get('file').name],
          headers: headers.get('x-test'),
          messageEvent: [messageEvent.data, messageEvent.origin],
          request: [request.method, await request.text()],
          response: [response.status, await response.text()],
          webSocket: webSocketResult,
        }));
      } finally {
        for (const socket of upgradedSockets) socket.destroy();
        await new Promise(resolve => {
          server.close(resolve);
          server.closeAllConnections();
        });
      }
    `)

    expect(JSON.parse(output)).toEqual({
      blob: ['text/plain', 'blob-body'],
      cache: ['cached', true],
      closeEvent: [1000, 'done', true],
      errorEvent: ['broken', 'test.js', 2, 3],
      eventSource: 'event-data',
      file: ['file.txt', 'text/plain', 123, 'file-body'],
      fileReader: 'blob-body',
      formData: ['value', 'file.txt'],
      headers: 'yes',
      messageEvent: [{ ok: true }, 'local'],
      request: ['POST', 'request-body'],
      response: [202, 'response-body'],
      webSocket: 'websocket-data',
    })
  })

  test('never overwrites globals supplied by the host', async () => {
    const output = await runNode(`
      const names = ${JSON.stringify(fetchGlobals)};
      const originals = Object.fromEntries(names.map(name => [name, { suppliedByHost: name }]));
      for (const name of names) {
        Object.defineProperty(globalThis, name, {
          configurable: true,
          value: originals[name],
          writable: true,
        });
      }
      await import(${JSON.stringify(esmPolyfillUrl)});
      console.log(names.every(name => globalThis[name] === originals[name]));
    `)

    expect(output).toBe('true')
  })

  test('fills only missing properties on custom targets and is idempotent', async () => {
    const output = await runNode(`
      const api = await import(${JSON.stringify(esmPolyfillUrl)});
      const suppliedFetch = () => 'host fetch';
      const target = { fetch: suppliedFetch };
      const first = api.installFetchGlobals(target);
      const installed = Object.fromEntries(
        api.WEB_GLOBAL_NAMES.map(name => [name, target[name]])
      );
      const second = api.installFetchGlobals(target);
      const descriptorsArePredictable = api.WEB_GLOBAL_NAMES.every(name => {
        if (name === 'fetch') return true;
        const descriptor = Object.getOwnPropertyDescriptor(target, name);
        return descriptor.configurable && !descriptor.enumerable && descriptor.writable;
      });
      console.log(JSON.stringify({
        descriptorsArePredictable,
        idempotent: api.WEB_GLOBAL_NAMES.every(name => target[name] === installed[name]),
        returnedTarget: first === target && second === target,
        suppliedFetchPreserved: target.fetch === suppliedFetch,
        types: Object.fromEntries(api.WEB_GLOBAL_NAMES.map(name => [name, typeof target[name]])),
      }));
    `)

    expect(JSON.parse(output)).toEqual({
      descriptorsArePredictable: true,
      idempotent: true,
      returnedTarget: true,
      suppliedFetchPreserved: true,
      types: fetchGlobalTypes,
    })
  })

  test('reports a precise error if an injected implementation is incomplete', async () => {
    const output = await runNode(`
      const api = await import(${JSON.stringify(esmPolyfillUrl)});
      const target = Object.fromEntries(
        api.WEB_GLOBAL_NAMES.filter(name => name !== 'Request').map(name => [name, {}])
      );
      try {
        api.installFetchGlobals(target, {});
      } catch (error) {
        console.log(error.message);
      }
    `)

    expect(output).toBe("The fetch polyfill does not provide the required 'Request' global.")
  })

  test('resolves the public package subpath for both module systems', async () => {
    const output = await runNode(`
      const esm = await import('use-m/fetch-polyfill');
      const { createRequire } = await import('node:module');
      const cjs = createRequire(import.meta.url)('use-m/fetch-polyfill');
      console.log(JSON.stringify({
        esm: esm.fetch === globalThis.fetch,
        cjs: cjs.fetch === globalThis.fetch,
        sameImplementation: esm.fetch === cjs.fetch,
      }));
    `)

    expect(JSON.parse(output)).toEqual({
      esm: true,
      cjs: true,
      sameImplementation: true,
    })
  })

  test('provides the same globals and exports to CommonJS callers', async () => {
    const output = await runNode(`
      ${clearFetchGlobals}
      const { createRequire } = await import('node:module');
      const api = createRequire(import.meta.url)(${JSON.stringify(cjsPolyfillPath)});
      console.log(JSON.stringify({
        globals: Object.fromEntries(fetchGlobals.map(name => [name, typeof globalThis[name]])),
        exportsMatch: fetchGlobals.every(name => api[name] === globalThis[name]),
        defaultMatches: api.default === globalThis.fetch,
      }));
    `)

    expect(JSON.parse(output)).toEqual({
      globals: fetchGlobalTypes,
      exportsMatch: true,
      defaultMatches: true,
    })
  })
})
