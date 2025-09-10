#!/usr/bin/env node

// Interactive ink CLI example using use-m
// This example shows a more complex ink application with state and user input
import { use } from '../../use.mjs';

async function main() {
  try {
    // Import React, ink, and other utilities using built-in module support
    const React = await use('react');
    const { render, Text, Box, useInput, useApp } = await use('ink');
    
    // Create an interactive CLI component
    const InteractiveApp = () => {
      const { exit } = useApp();
      const [counter, setCounter] = React.useState(0);
      const [lastKey, setLastKey] = React.useState('');
      
      // Handle user input
      useInput((input, key) => {
        setLastKey(input || key.name || 'unknown');
        
        if (input === '+') {
          setCounter(prev => prev + 1);
        } else if (input === '-') {
          setCounter(prev => prev - 1);
        } else if (input === 'q' || key.ctrl && input === 'c') {
          exit();
        }
      });
      
      return React.createElement(Box, 
        { flexDirection: 'column', padding: 1 },
        React.createElement(Text, 
          { color: 'green', bold: true }, 
          '🎮 Interactive ink App with use-m'
        ),
        React.createElement(Text, null, ''),
        React.createElement(Box, { flexDirection: 'column' },
          React.createElement(Text, 
            { color: 'cyan' }, 
            `Counter: ${counter}`
          ),
          React.createElement(Text, 
            { color: 'gray' }, 
            `Last key pressed: ${lastKey}`
          )
        ),
        React.createElement(Text, null, ''),
        React.createElement(Box, { flexDirection: 'column' },
          React.createElement(Text, { color: 'yellow' }, 'Controls:'),
          React.createElement(Text, null, '  + : Increment counter'),
          React.createElement(Text, null, '  - : Decrement counter'),
          React.createElement(Text, null, '  q : Quit application')
        ),
        React.createElement(Text, null, ''),
        React.createElement(Text, 
          { color: 'dim' }, 
          'Built with React, ink, and use-m'
        )
      );
    };
    
    // Render the interactive CLI app
    render(React.createElement(InteractiveApp));
    
  } catch (error) {
    console.error('Error:', error.message);
    console.log('\nTo run this example, install the required dependencies:');
    console.log('npm install react ink');
  }
}

main().catch(console.error);