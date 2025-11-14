# Contributing to use-m

Thank you for your interest in contributing to use-m! This document provides guidelines and instructions for contributing to the project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Making Changes](#making-changes)
- [Testing](#testing)
- [Coding Standards](#coding-standards)
- [Submitting Changes](#submitting-changes)
- [Reporting Issues](#reporting-issues)

## Code of Conduct

This project follows a simple code of conduct: be respectful, collaborative, and constructive in all interactions.

## Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/use-m.git
   cd use-m
   ```
3. **Add the upstream repository**:
   ```bash
   git remote add upstream https://github.com/link-foundation/use-m.git
   ```

## Development Setup

### Prerequisites

- Node.js 20.x or later
- npm (comes with Node.js)
- Optionally: Bun and/or Deno for cross-runtime testing

### Install Dependencies

```bash
npm install
```

### Verify Installation

Run the test suite to ensure everything is working:

```bash
npm test
```

For cross-runtime testing:

```bash
# Node.js (default)
npm test

# Bun
bun test

# Deno
deno test --allow-net --allow-env --allow-run --allow-read --allow-write --allow-sys
```

## Project Structure

```
/home/user/use-m/
├── use.mjs             # ES Module version (main implementation)
├── use.cjs             # CommonJS version
├── use.js              # Universal version (browser/eval)
├── cli.mjs             # CLI tool
├── loader.js           # Node.js module loader hooks
├── test-adapter.mjs    # Cross-runtime test framework adapter
├── test-adapter.cjs    # CommonJS version of test adapter
├── tests/              # Test suite (34 test files)
├── examples/           # Usage examples (15 examples)
├── .github/workflows/  # CI/CD configuration
└── docs/               # Documentation files
```

### Key Files

- **use.mjs**: Primary implementation file. Changes here should be synchronized to use.cjs
- **use.cjs**: CommonJS variant of use.mjs
- **tests/**: Each test file has both .mjs and .cjs versions
- **examples/**: Real-world usage examples

## Making Changes

### Branching Strategy

1. **Create a feature branch** from `main`:
   ```bash
   git checkout main
   git pull upstream main
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes** in logical, atomic commits

3. **Keep your branch updated**:
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

### Types of Changes

- **Bug fixes**: Target specific issues with clear reproduction steps
- **Features**: New functionality or enhancements
- **Documentation**: Improvements to README, examples, or inline docs
- **Tests**: Additional test coverage or test improvements
- **Refactoring**: Code improvements without changing functionality

### Important Notes

- **Dual-file updates**: Changes to `use.mjs` typically require corresponding updates to `use.cjs`
- **Cross-runtime compatibility**: Ensure changes work on Node.js, Bun, and Deno
- **Examples**: Update examples if you change public APIs

## Testing

### Running Tests

```bash
# Run all tests (Node.js with Jest)
npm test

# Run specific test file
npm test -- use.test.mjs

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm test -- --coverage
```

### Writing Tests

- Use the cross-runtime test adapter: `import { describe, test, expect } from '../test-adapter.mjs'`
- Create both `.mjs` and `.cjs` versions of new tests
- Test both success and error paths
- Include edge cases

Example test structure:

```javascript
import { describe, test, expect } from '../test-adapter.mjs';
import { use } from '../use.mjs';

describe('Feature name', () => {
  test('should do something specific', async () => {
    const result = await use('lodash@4.17.21');
    expect(result).toBeDefined();
  });

  test('should handle errors correctly', async () => {
    await expect(async () => {
      await use('invalid-package-name-12345');
    }).rejects.toThrow();
  });
});
```

### Testing Guidelines

- Test all supported runtimes (Node.js, Bun, Deno) when possible
- Test both ESM and CommonJS module formats
- Verify built-in module emulation
- Test relative path resolution
- Test error conditions and edge cases

## Coding Standards

### JavaScript Style

- **Modern JavaScript**: Use ES6+ features (const/let, arrow functions, async/await)
- **No semicolons**: Follow the existing semicolon-less style
- **2 spaces**: For indentation
- **Clear variable names**: Prefer descriptive names over abbreviations
- **Comments**: Add comments for complex logic, but prefer self-documenting code

### Best Practices

1. **Error handling**: Always provide helpful error messages with context
   ```javascript
   throw new Error(`Failed to resolve '${moduleName}'`, { cause: error });
   ```

2. **Async/await**: Prefer async/await over promise chains for consistency

3. **Validation**: Validate inputs early and provide clear error messages

4. **Cross-runtime**: Use feature detection instead of runtime-specific checks when possible

### Documentation

- Add JSDoc comments for exported functions
- Update README.md if adding new features
- Create or update examples for significant changes
- Document breaking changes clearly

## Submitting Changes

### Before Submitting

1. **Run tests**: Ensure all tests pass
   ```bash
   npm test
   ```

2. **Check for linting errors** (if applicable)

3. **Update documentation**: README, examples, inline comments

4. **Verify cross-runtime compatibility**: Test on Node.js, and ideally Bun/Deno

### Pull Request Process

1. **Push your changes** to your fork:
   ```bash
   git push origin feature/your-feature-name
   ```

2. **Create a pull request** on GitHub:
   - Use a clear, descriptive title
   - Reference any related issues (e.g., "Fixes #123")
   - Describe what changed and why
   - Include examples of new functionality
   - Note any breaking changes

3. **PR description template**:
   ```markdown
   ## Summary
   Brief description of changes

   ## Motivation
   Why is this change needed?

   ## Changes
   - List of specific changes
   - Another change

   ## Testing
   - How was this tested?
   - What edge cases were considered?

   ## Breaking Changes
   - List any breaking changes (if applicable)

   ## Related Issues
   Fixes #issue_number
   ```

4. **Respond to feedback**: Be open to suggestions and iterate on your PR

### Commit Messages

Write clear, descriptive commit messages:

```
feat: add support for CDN fallback mechanism

- Implement fallback to multiple CDNs if primary fails
- Add tests for CDN fallback scenarios
- Update documentation with new CDN options

Fixes #45
```

**Commit message format**:
- `feat:` for new features
- `fix:` for bug fixes
- `docs:` for documentation changes
- `test:` for test additions/changes
- `refactor:` for code refactoring
- `chore:` for maintenance tasks

## Reporting Issues

### Bug Reports

Include:
- **Description**: Clear description of the bug
- **Steps to reproduce**: Minimal reproduction steps
- **Expected behavior**: What you expected to happen
- **Actual behavior**: What actually happened
- **Environment**: OS, Node.js version, runtime (Node/Bun/Deno)
- **Code sample**: Minimal code that reproduces the issue

### Feature Requests

Include:
- **Use case**: Why is this feature needed?
- **Proposed solution**: How should it work?
- **Alternatives considered**: Other approaches you've thought about
- **Examples**: Code examples of how the feature would be used

## Development Tips

### Debugging

1. **Add temporary logging**:
   ```javascript
   console.log('Debug:', variable);
   ```

2. **Use debugger**:
   ```javascript
   debugger; // Use with Node.js --inspect flag
   ```

3. **Run specific tests**:
   ```bash
   npm test -- use.test.mjs
   ```

### Testing Locally

Test your changes in a real project:

```bash
cd /path/to/your/test/project
npm link /path/to/use-m
```

### Cross-Runtime Testing

```bash
# Node.js
npm test

# Bun
bun test

# Deno
deno test --allow-net --allow-env --allow-run --allow-read --allow-write --allow-sys
```

## Questions?

- **Issues**: Open an issue on GitHub
- **Discussions**: Use GitHub Discussions for questions and ideas
- **Email**: Contact the maintainers

## License

By contributing to use-m, you agree that your contributions will be licensed under the Unlicense (public domain).

---

Thank you for contributing to use-m! Your efforts help make this project better for everyone.
