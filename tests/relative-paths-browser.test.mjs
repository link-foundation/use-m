import { describe, test, expect, beforeAll, afterAll } from '../test-adapter.mjs';

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

describe(`${moduleName} Relative path resolution in browser`, () => {
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
    
    // Start server on port 8003 (different port to avoid conflicts)
    server = app.listen(8003);
    
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
    await page.goto('http://localhost:8003/tests/browser-server/relative-paths-browser.test.html', {
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

  test(`${moduleName} ./ path for JS file in same directory should work`, async () => {
    const result = await page.evaluate(() => {
      const results = Array.from(document.querySelectorAll('.test-result'));
      const test = results.find(el => el.textContent.includes('./ path for JS file in same directory'));
      return test ? test.classList.contains('test-pass') : false;
    });
    
    expect(result).toBe(true);
  });

  test(`${moduleName} ./ path for JSON file in same directory should work`, async () => {
    const result = await page.evaluate(() => {
      const results = Array.from(document.querySelectorAll('.test-result'));
      const test = results.find(el => el.textContent.includes('./ path for JSON file in same directory'));
      return test ? test.classList.contains('test-pass') : false;
    });
    
    expect(result).toBe(true);
  });

  test(`${moduleName} ../../ path for JS file in parent directory should work`, async () => {
    const result = await page.evaluate(() => {
      const results = Array.from(document.querySelectorAll('.test-result'));
      const test = results.find(el => el.textContent.includes('../../ path for JS file in parent directory'));
      return test ? test.classList.contains('test-pass') : false;
    });
    
    expect(result).toBe(true);
  });

  test(`${moduleName} ./subfolder/ path for nested JS file should work`, async () => {
    const result = await page.evaluate(() => {
      const results = Array.from(document.querySelectorAll('.test-result'));
      const test = results.find(el => el.textContent.includes('./subfolder/ path for nested JS file'));
      return test ? test.classList.contains('test-pass') : false;
    });
    
    expect(result).toBe(true);
  });

  test(`${moduleName} ./subfolder/ path for nested JSON file should work`, async () => {
    const result = await page.evaluate(() => {
      const results = Array.from(document.querySelectorAll('.test-result'));
      const test = results.find(el => el.textContent.includes('./subfolder/ path for nested JSON file'));
      return test ? test.classList.contains('test-pass') : false;
    });
    
    expect(result).toBe(true);
  });

  test(`${moduleName} mixed relative and npm imports should work`, async () => {
    const result = await page.evaluate(() => {
      const results = Array.from(document.querySelectorAll('.test-result'));
      const test = results.find(el => el.textContent.includes('Mixed relative and npm imports'));
      return test ? test.classList.contains('test-pass') : false;
    });
    
    expect(result).toBe(true);
  });

  test(`${moduleName} all relative path browser tests should pass`, async () => {
    const testResults = await page.evaluate(() => window.testResults);
    
    expect(testResults).toBeDefined();
    expect(testResults.total).toBeGreaterThan(0);
    expect(testResults.failed).toBe(0);
    expect(testResults.success).toBe(true);
    expect(testResults.passed).toBe(testResults.total);
  });
});