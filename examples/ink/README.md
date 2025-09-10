# ink CLI Examples with use-m

This directory contains examples showing how to use ink (React for CLI) with use-m's built-in module support.

## Examples

### Simple CLI Example (`cli-example.mjs`)

Demonstrates basic ink CLI application with use-m:

```bash
# Install dependencies first
npm install react ink

# Run the example
node cli-example.mjs
```

This example shows:
- Loading React and ink using use-m's built-in modules
- Creating CLI components with ink
- Text rendering and styling in terminal

### Interactive CLI Example (`interactive-example.mjs`)

Demonstrates interactive ink CLI application with use-m:

```bash
# Install dependencies first
npm install react ink

# Run the interactive example
node interactive-example.mjs
```

This example shows:
- Interactive CLI with user input handling
- State management with React hooks
- Real-time updates in terminal interface
- Keyboard event handling

## Controls for Interactive Example

- `+` : Increment counter
- `-` : Decrement counter  
- `q` : Quit application
- `Ctrl+C` : Force quit

## Features Demonstrated

- **Built-in Module Support**: Use `await use('ink')` and `await use('react')` without package.json
- **CLI Components**: React components that render to terminal instead of DOM
- **Interactive UIs**: Handle keyboard input and update UI in real-time
- **Hooks Support**: useState, useInput, useApp and other React/ink hooks
- **Terminal Styling**: Colors, formatting, and layout in terminal

## Use Cases

- Command-line tools and utilities
- Interactive terminal applications
- Developer tools and build scripts
- System administration interfaces
- Educational CLI applications

## Requirements

ink requires Node.js environment and will not work in browser. The built-in module support automatically handles this by returning `null` for browser environments.