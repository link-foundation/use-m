#!/usr/bin/env node

// Node.js React.js example using use-m
// This example shows how to use React.js built-in modules with use-m in Node.js
import { use } from '../../use.mjs';

async function main() {
  try {
    // Import React using built-in module support
    const React = await use('react');
    const ReactDOMServer = await use('react-dom/server');
    
    // Create a simple React component
    const MyComponent = React.createElement('div', null, 
      React.createElement('h1', null, 'Hello from React with use-m!'),
      React.createElement('p', null, 'This React component was loaded using use-m built-in module support.')
    );
    
    // Render to string (server-side rendering)
    const html = ReactDOMServer.renderToString(MyComponent);
    console.log('Rendered React component:');
    console.log(html);
    
    console.log('\nReact version:', React.version);
  } catch (error) {
    console.error('Error:', error.message);
    console.log('\nTo run this example, install React:');
    console.log('npm install react react-dom');
  }
}

main().catch(console.error);