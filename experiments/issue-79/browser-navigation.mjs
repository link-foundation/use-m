// Reproduce unrelated requests blocking a completed browser test page.
// The default uses the actual navigation policy in the browser test.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import express from 'express';
import puppeteer from 'puppeteer';

const source = await readFile(new URL('../../tests/builtin-browser.test.mjs', import.meta.url), 'utf8');
const waitUntil = source.match(/waitUntil: '([^']+)'/)[1];
const app = express();
const pending = new Set();
app.get('/pending-request', (_request, response) => {
  pending.add(response);
  response.on('close', () => pending.delete(response));
});
app.use(express.static(fileURLToPath(new URL('../../', import.meta.url))));
const server = await new Promise(resolve => {
  const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
});
let browser;
try {
  browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.evaluateOnNewDocument(() => {
    addEventListener('DOMContentLoaded', () => { fetch('/pending-request').catch(() => {}); });
  });
  await page.goto(`http://127.0.0.1:${server.address().port}/tests/browser-server/browser-test.html`, {
    waitUntil, timeout: 3_000,
  });
  await page.waitForFunction(() => window.testResults, { timeout: 10_000 });
  assert.equal((await page.evaluate(() => window.testResults)).success, true);
  console.log(`PASS: completed browser assertions with ${waitUntil} despite an unrelated pending request.`);
} finally {
  await browser?.close();
  for (const response of pending) response.destroy();
  await new Promise(resolve => server.close(resolve));
}
