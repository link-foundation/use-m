import { describe, test, expect } from '../test-adapter.mjs';
import { use } from '../use.mjs';
const moduleName = `[${import.meta.url.split('.').pop()} module]`;

describe(`${moduleName} ink built-in modules`, () => {
  test(`${moduleName} ink module should be defined in Node.js environment`, async () => {
    // ink is only available in Node.js environment
    if (typeof window !== 'undefined') {
      // In browser environment, ink should not be available
      try {
        await use('ink');
        // If this doesn't throw, something is wrong
        expect(true).toBe(false); // Force failure
      } catch (error) {
        expect(error.message).toContain('not available in browser environment');
      }
      return;
    }

    // In Node.js environment
    try {
      const ink = await use('ink');
      
      expect(ink).toBeDefined();
      expect(typeof ink.render).toBe('function');
      expect(typeof ink.Text).toBe('function');
      expect(typeof ink.Box).toBe('function');
      
      // Test that ink components are React components
      const React = await use('react');
      const TextElement = React.createElement(ink.Text, null, 'Hello');
      expect(TextElement).toBeDefined();
      expect(TextElement.type).toBe(ink.Text);
    } catch (error) {
      if (error.message.includes('ink is not installed')) {
        // Skip test if ink is not installed
        console.log('Skipping ink test - ink not installed');
      } else {
        throw error;
      }
    }
  });

  test(`${moduleName} ink should not be available in browser environment`, async () => {
    // Simulate browser environment
    const originalWindow = global.window;
    const originalDocument = global.document;
    
    try {
      // Set browser-like globals
      global.window = { location: { href: 'http://localhost' } };
      global.document = {};
      
      await expect(use('ink')).rejects.toThrow();
    } catch (error) {
      // ink should not be available in browser
      expect(error.message).toContain('not available in browser environment');
    } finally {
      // Restore original globals
      if (originalWindow !== undefined) {
        global.window = originalWindow;
      } else {
        delete global.window;
      }
      if (originalDocument !== undefined) {
        global.document = originalDocument;
      } else {
        delete global.document;
      }
    }
  });

  test(`${moduleName} should handle ink module errors gracefully`, async () => {
    // Skip in browser environment
    if (typeof window !== 'undefined') {
      return;
    }

    try {
      await use('ink');
    } catch (error) {
      // If ink is not installed, we should get a helpful error message
      if (error.message.includes('ink is not installed')) {
        expect(error.message).toContain('npm install ink');
      }
      // If ink is available, this test passes
    }
  });

  test(`${moduleName} ink hooks should be available when ink is installed`, async () => {
    // Skip in browser environment
    if (typeof window !== 'undefined') {
      return;
    }

    try {
      const ink = await use('ink');
      
      // Test that common ink hooks are available
      expect(typeof ink.useInput).toBe('function');
      expect(typeof ink.useApp).toBe('function');
      expect(typeof ink.useStdout).toBe('function');
      expect(typeof ink.useStderr).toBe('function');
    } catch (error) {
      if (error.message.includes('ink is not installed')) {
        // Skip test if ink is not installed
        console.log('Skipping ink hooks test - ink not installed');
      } else {
        throw error;
      }
    }
  });
});