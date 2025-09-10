# React.js Examples with use-m

This directory contains examples showing how to use React.js with use-m's built-in module support.

## Examples

### Node.js Example (`node-example.mjs`)

Demonstrates server-side React.js usage with use-m:

```bash
# Install dependencies first
npm install react react-dom

# Run the example
node node-example.mjs
```

This example shows:
- Loading React using use-m's built-in `react` module
- Server-side rendering with ReactDOMServer
- Error handling for missing dependencies

### Browser Example (`browser-example.html`)

Demonstrates client-side React.js usage with use-m:

```bash
# Open in browser
open browser-example.html
# or serve with a local server
python -m http.server 8000
```

This example shows:
- Loading React in the browser using use-m's built-in modules
- Creating and rendering React components
- Fallback to CDN if React globals aren't available
- Interactive React components with event handlers

## Features Demonstrated

- **Built-in Module Support**: Use `await use('react')` instead of installing dependencies
- **Environment Detection**: Automatically works in both Node.js and browser
- **Version Management**: Uses consistent React versions across environments
- **Error Handling**: Graceful fallbacks when dependencies are missing
- **CDN Fallback**: Browser examples automatically load from CDN

## Use Cases

- Rapid prototyping without setting up package.json
- Educational examples and tutorials
- Self-contained scripts that don't require dependency management
- Cross-environment React applications