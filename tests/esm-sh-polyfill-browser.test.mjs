import { describe, test, expect, beforeAll, afterAll } from '../src/test-adapter.mjs';

const isDeno = typeof Deno !== 'undefined';

let express, puppeteer, makeBrowserCommander;
if (!isDeno) {
  express = await import('express').then(m => m.default);
  puppeteer = await import('puppeteer').then(m => m.default);
  makeBrowserCommander = await import('browser-commander').then(m => m.makeBrowserCommander);
}

import { access, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const moduleName = `[${import.meta.url.split('.').pop()} module]`;
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const resolveChromeExecutablePath = async () => {
  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    return process.env.PUPPETEER_EXECUTABLE_PATH;
  }
  const localChromePath = '/usr/bin/google-chrome';
  try {
    await access(localChromePath);
    return localChromePath;
  } catch {
    return undefined;
  }
};

describe(`${moduleName} esm.sh browser polyfill handling`, () => {
  if (isDeno) {
    test.skip = test.skip || test;
    test.skip('Browser tests are skipped in Deno environment', () => {
      expect(true).toBe(true);
    });
    return;
  }

  let browser;
  let commander;
  let server;
  let userDataDir;
  const consoleMessages = [];

  beforeAll(async () => {
    const app = express();
    app.use(express.static(join(__dirname, '..')));
    server = app.listen(8004);
    await new Promise(resolve => setTimeout(resolve, 500));

    userDataDir = await mkdtemp(join(tmpdir(), 'use-m-issue62-browser-'));
    const executablePath = await resolveChromeExecutablePath();
    browser = await puppeteer.launch({
      headless: 'new',
      userDataDir,
      ...(executablePath ? { executablePath } : {}),
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox'
      ]
    });
    const [page] = await browser.pages();
    commander = makeBrowserCommander({
      page,
      enableNetworkTracking: false,
      enableNavigationManager: false,
      enableDialogManager: false
    });
    page.on('console', msg => {
      consoleMessages.push(`${msg.type()}: ${msg.text()}`);
    });
    page.on('pageerror', error => {
      consoleMessages.push(`pageerror: ${error.message}`);
    });

    await commander.goto({
      url: 'http://localhost:8004/tests/browser-server/esm-sh-polyfill-browser.test.html',
      waitUntil: 'networkidle0',
      waitForStableUrlBefore: false,
      waitForStableUrlAfter: false,
      waitForNetworkIdle: false,
      verify: false,
      timeout: 60000
    });
    await commander.page.waitForFunction(
      () => window.testResults && typeof window.testResults.success === 'boolean',
      { timeout: 60000 }
    );
  }, 120000);

  afterAll(async () => {
    if (commander) {
      await commander.destroy();
    }
    if (browser) {
      await browser.close();
    }
    if (server) {
      server.close();
    }
    if (userDataDir) {
      await rm(userDataDir, { recursive: true, force: true });
    }
  });

  test(`${moduleName} process and filename browser shims still use CDN resolver`, async () => {
    const result = await commander.page.evaluate(() => window.testResults);

    expect(result.error).toBeNull();
    expect(result.success).toBe(true);
    expect(result.modulePath).toBe('https://esm.sh/d3');
    expect(result.imports).toEqual(['https://esm.sh/d3']);
    expect(consoleMessages.join('\n')).not.toContain('node:child_process');
    expect(consoleMessages.join('\n')).not.toContain('child_process.exec is not implemented');
  });
});
