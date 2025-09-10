const { describe, test, expect } = require('./test-adapter.cjs');
const { use } = require('./use.cjs');
const moduleName = `[${__filename.split('.').pop()} module]`;

describe(`${moduleName} React.js built-in modules (CommonJS)`, () => {
  test(`${moduleName} react module should be defined`, async () => {
    // This test may skip in environments where React is not available
    try {
      const React = await use('react');
      
      expect(React).toBeDefined();
      expect(typeof React.createElement).toBe('function');
      expect(typeof React.version).toBe('string');
      
      // Test basic React functionality
      const element = React.createElement('div', { id: 'test' }, 'Hello World');
      expect(element).toBeDefined();
      expect(element.type).toBe('div');
      expect(element.props.id).toBe('test');
      expect(element.props.children).toBe('Hello World');
    } catch (error) {
      if (error.message.includes('React is not installed')) {
        // Skip test if React is not installed
        console.log('Skipping React test - React not installed');
      } else {
        throw error;
      }
    }
  });

  test(`${moduleName} react-dom module should be defined`, async () => {
    try {
      const ReactDOM = await use('react-dom');
      
      expect(ReactDOM).toBeDefined();
      
      // In Node.js environment, we should have server-side rendering
      if (typeof window === 'undefined') {
        // Check for ReactDOMServer functions
        expect(ReactDOM.renderToString || ReactDOM.renderToStaticMarkup).toBeDefined();
      } else {
        // In browser, check for DOM rendering functions
        expect(ReactDOM.render || ReactDOM.createRoot).toBeDefined();
      }
    } catch (error) {
      if (error.message.includes('ReactDOM is not installed')) {
        // Skip test if ReactDOM is not installed
        console.log('Skipping ReactDOM test - ReactDOM not installed');
      } else {
        throw error;
      }
    }
  });

  test(`${moduleName} react/jsx-runtime module should be defined`, async () => {
    try {
      const jsxRuntime = await use('react/jsx-runtime');
      
      expect(jsxRuntime).toBeDefined();
      expect(typeof jsxRuntime.jsx || typeof jsxRuntime.jsxs).toBe('function');
    } catch (error) {
      if (error.message.includes('React JSX runtime is not available')) {
        // Skip test if React JSX runtime is not available
        console.log('Skipping JSX runtime test - React JSX runtime not available');
      } else {
        throw error;
      }
    }
  });

  test(`${moduleName} should handle React module errors gracefully`, async () => {
    // Test that we get meaningful error messages when React is not available
    try {
      // This should attempt to load React
      await use('react');
    } catch (error) {
      // If React is not installed, we should get a helpful error message
      if (error.message.includes('React is not installed')) {
        expect(error.message).toContain('npm install react');
      }
      // If React is available, this test passes
    }
  });
});