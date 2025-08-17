import { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach } from '../test-adapter.mjs';

// Skip browser tests in Deno environment
const isDeno = typeof Deno !== 'undefined';

let puppeteer, express;
if (!isDeno) {
  puppeteer = await import('puppeteer').then(m => m.default);
  express = await import('express').then(m => m.default);
}

import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const moduleName = `[${import.meta.url.split('.').pop()} module]`;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe(`${moduleName} Universal built-in modules in browser`, () => {
  // Skip all browser tests in Deno
  if (isDeno) {
    test.skip = test.skip || test;
    test.skip('Browser tests are skipped in Deno environment', () => {
      expect(true).toBe(true);
    });
    return;
  }

  let browser;
  let server;
  let page;

  beforeAll(async () => {
    // Start Express server
    const app = express();
    const projectRoot = join(__dirname, '..');
    
    // Serve static files from project root
    app.use(express.static(projectRoot));
    
    // Start server on port 8002 (different from manual script to avoid conflicts)
    server = app.listen(8002);
    
    // Wait for server to be ready
    await new Promise(resolve => setTimeout(resolve, 500));

    // Launch browser
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox'
      ]
    });

    page = await browser.newPage();
    
    // Silence console logs unless there are errors
    page.on('console', msg => {
      const type = msg.type();
      const text = msg.text();
      
      if (type === 'error' && !text.includes('Failed to load resource')) {
        console.error('Browser console error:', text);
      }
    });

    // Navigate to the test page
    await page.goto('http://localhost:8002/tests/browser-test.html', {
      waitUntil: 'networkidle0',
      timeout: 30000
    });

    // Wait for tests to complete
    await page.waitForFunction(
      () => window.testResults && typeof window.testResults.total === 'number',
      { timeout: 60000 }
    );
  });

  afterAll(async () => {
    if (browser) {
      await browser.close();
    }
    if (server) {
      server.close();
    }
  });

  test(`${moduleName} console module should work in browser`, async () => {
    const result = await page.evaluate(() => {
      const results = Array.from(document.querySelectorAll('.test-result'));
      const consoleTest = results.find(el => el.textContent.includes('console module should work'));
      return consoleTest ? consoleTest.classList.contains('test-pass') : false;
    });
    
    expect(result).toBe(true);
  });

  test(`${moduleName} crypto module should work in browser`, async () => {
    const result = await page.evaluate(() => {
      const results = Array.from(document.querySelectorAll('.test-result'));
      const cryptoTest = results.find(el => el.textContent.includes('crypto module should work'));
      return cryptoTest ? cryptoTest.classList.contains('test-pass') : false;
    });
    
    expect(result).toBe(true);
  });

  test(`${moduleName} url module should work in browser`, async () => {
    const result = await page.evaluate(() => {
      const results = Array.from(document.querySelectorAll('.test-result'));
      const urlTest = results.find(el => el.textContent.includes('url module should work'));
      return urlTest ? urlTest.classList.contains('test-pass') : false;
    });
    
    expect(result).toBe(true);
  });

  test(`${moduleName} performance module should work in browser`, async () => {
    const result = await page.evaluate(() => {
      const results = Array.from(document.querySelectorAll('.test-result'));
      const perfTest = results.find(el => el.textContent.includes('performance module should work'));
      return perfTest ? perfTest.classList.contains('test-pass') : false;
    });
    
    expect(result).toBe(true);
  });

  test(`${moduleName} fs module should fail in browser with correct error`, async () => {
    const result = await page.evaluate(() => {
      const results = Array.from(document.querySelectorAll('.test-result'));
      const fsTest = results.find(el => el.textContent.includes('fs module should fail in browser'));
      return fsTest ? fsTest.classList.contains('test-pass') : false;
    });
    
    expect(result).toBe(true);
  });

  test(`${moduleName} node: prefix should work with universal modules`, async () => {
    const result = await page.evaluate(() => {
      const results = Array.from(document.querySelectorAll('.test-result'));
      const nodePrefixTest = results.find(el => el.textContent.includes('node:url prefix should work'));
      return nodePrefixTest ? nodePrefixTest.classList.contains('test-pass') : false;
    });
    
    expect(result).toBe(true);
  });

  test(`${moduleName} uppercase module names should fail (strict lowercase only)`, async () => {
    const result = await page.evaluate(() => {
      const results = Array.from(document.querySelectorAll('.test-result'));
      const uppercaseTest = results.find(el => el.textContent.includes('uppercase URL should fail'));
      return uppercaseTest ? uppercaseTest.classList.contains('test-pass') : false;
    });
    
    expect(result).toBe(true);
  });

  test(`${moduleName} all browser tests should pass`, async () => {
    const testResults = await page.evaluate(() => window.testResults);
    
    expect(testResults.total).toBeGreaterThan(0);
    expect(testResults.failed).toBe(0);
    expect(testResults.success).toBe(true);
    expect(testResults.passed).toBe(testResults.total);
  });
});