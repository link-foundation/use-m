#!/usr/bin/env node

// ink CLI example using use-m
// This example shows how to use ink built-in modules with use-m
import { use } from '../../use.mjs';

async function main() {
  try {
    // Import ink and React using built-in module support
    const React = await use('react');
    const { render, Text, Box } = await use('ink');
    
    // Create a simple CLI component using React and ink
    const CliApp = () => React.createElement(Box, 
      { flexDirection: 'column', padding: 1 },
      React.createElement(Text, 
        { color: 'green', bold: true }, 
        '🚀 Hello from ink with use-m!'
      ),
      React.createElement(Text, null, 'This CLI app was built using:'),
      React.createElement(Box, { marginLeft: 2, flexDirection: 'column' },
        React.createElement(Text, { color: 'blue' }, '• React for component logic'),
        React.createElement(Text, { color: 'blue' }, '• ink for CLI rendering'),
        React.createElement(Text, { color: 'blue' }, '• use-m for dynamic imports')
      ),
      React.createElement(Text, null, ''),
      React.createElement(Text, 
        { color: 'yellow' }, 
        `React version: ${React.version}`
      )
    );
    
    // Render the CLI app
    const { waitUntilExit } = render(React.createElement(CliApp));
    
    // Wait for the app to finish (though this simple example will exit immediately)
    await waitUntilExit();
    
  } catch (error) {
    console.error('Error:', error.message);
    console.log('\nTo run this example, install the required dependencies:');
    console.log('npm install react ink');
  }
}

main().catch(console.error);