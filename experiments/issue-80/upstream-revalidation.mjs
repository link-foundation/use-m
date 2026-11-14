#!/usr/bin/env node

// Reporter's loopback diagnostic from issue #80, adapted to this checkout:
// https://github.com/konard/vietnam-accomodation-search/blob/8834279005932a2ee3eabd96e245cc9b686def09/experiments/revalidation-use-m-body-timeout.mjs
// It imports loadUseM from src/ and drops the consumer-only shim control.
// Exits 1 while loadUseM leaves a stalled response body unbounded.
import { createServer } from 'node:http';
import { performance } from 'node:perf_hooks';
import { loadUseM } from '../../src/load.mjs';

const source = `/* ${'fixture '.repeat(50)} */ ({ use: async () => ({}) })`;
const server = createServer((request, response) => {
  response.writeHead(200, { 'content-type': 'application/javascript' });
  if (request.url === '/stall') {
    response.write('/* unfinished self-authored fixture');
  } else {
    response.end(source);
  }
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;

async function observe(operation, state, observationMs = 400) {
  let outcome = 'pending';
  const started = performance.now();
  const pending = operation().then(
    () => {
      outcome = 'fulfilled';
    },
    () => {
      outcome = 'rejected';
    }
  );
  let timer;
  try {
    await Promise.race([
      pending,
      new Promise((resolve) => {
        timer = setTimeout(resolve, observationMs);
      }),
    ]);
    return {
      outcome,
      elapsedMs: Math.round(performance.now() - started),
      headersReceived: state.headersReceived,
      signalAborted: state.signal?.aborted ?? false,
    };
  } finally {
    clearTimeout(timer);
  }
}

function trackedFetch(state) {
  return async (url, options) => {
    state.signal = options?.signal;
    const response = await fetch(url, options);
    state.headersReceived = true;
    return response;
  };
}

const rows = [];
try {
  for (const path of ['/ok', '/stall']) {
    const state = { headersReceived: false };
    const result = await observe(
      () =>
        loadUseM({
          fetch: trackedFetch(state),
          sources: [`${origin}${path}`],
          maxAttemptsPerSource: 1,
          timeoutMs: 100,
        }),
      state
    );
    rows.push({
      name: `upstream-${path.slice(1)}`,
      ...result,
      pass:
        result.headersReceived &&
        result.outcome === (path === '/ok' ? 'fulfilled' : 'rejected'),
    });
  }
} finally {
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
}
console.log(JSON.stringify({ mode: 'self-authored-loopback', rows }, null, 2));
process.exitCode = rows.every((row) => row.pass) ? 0 : 1;
