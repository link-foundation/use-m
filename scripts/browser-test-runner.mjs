#!/usr/bin/env node

import puppeteer from 'puppeteer';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runBrowserTests() {
  console.log('🚀 Starting browser tests for universal built-in modules...\n');

  let browser;
  let server;
  let success = false;
  
  try {
    // Start a local HTTP server
    const { spawn } = await import('child_process');
    server = spawn('python3', ['-m', 'http.server', '8001'], {
      cwd: join(__dirname, '..'),
      stdio: 'pipe'
    });
    
    // Wait for server to start
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Launch browser
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox'
      ]
    });

    const page = await browser.newPage();
    
    // Enable console logging from the page
    page.on('console', msg => {
      const type = msg.type();
      const text = msg.text();
      
      if (type === 'error') {
        console.error('❌ Browser console error:', text);
      } else if (type === 'warn') {
        console.warn('⚠️  Browser console warning:', text);
      } else if (text.startsWith('Test failed:')) {
        console.error('❌', text);
      }
    });

    // Handle page errors
    page.on('pageerror', error => {
      console.error('❌ Page error:', error.message);
    });

    // Use HTTP server URL
    const testHtmlUrl = 'http://localhost:8001/tests/browser-test.html';

    console.log('📄 Loading test page:', testHtmlUrl);

    // Navigate to the test page
    await page.goto(testHtmlUrl, {
      waitUntil: 'networkidle0',
      timeout: 30000
    });

    // Wait for tests to complete by checking for the testResults object on window
    console.log('⏳ Waiting for tests to complete...\n');
    
    await page.waitForFunction(
      () => window.testResults && typeof window.testResults.total === 'number',
      { timeout: 60000 }
    );

    // Get the test results
    const results = await page.evaluate(() => window.testResults);
    
    // Get the detailed results from the page
    const testDetails = await page.evaluate(() => {
      const resultElements = document.querySelectorAll('.test-result:not(.test-pending)');
      return Array.from(resultElements).map(el => ({
        text: el.textContent,
        passed: el.classList.contains('test-pass')
      }));
    });

    // Display results
    console.log('📊 Test Results:');
    console.log('================\n');
    
    testDetails.forEach(test => {
      console.log(test.text);
    });

    console.log('\n📈 Summary:');
    console.log(`Total tests: ${results.total}`);
    console.log(`✅ Passed: ${results.passed}`);
    console.log(`❌ Failed: ${results.failed}`);
    console.log(`Success rate: ${results.total > 0 ? Math.round((results.passed / results.total) * 100) : 0}%`);

    success = results.success;

    if (success) {
      console.log('\n🎉 All browser tests passed!');
    } else {
      console.log('\n💥 Some browser tests failed!');
    }

  } catch (error) {
    console.error('❌ Error running browser tests:', error.message);
    success = false;
  } finally {
    if (browser) {
      await browser.close();
    }
    if (server) {
      server.kill();
    }
  }

  // Exit with appropriate code
  process.exit(success ? 0 : 1);
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runBrowserTests();
}