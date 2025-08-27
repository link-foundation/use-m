[![npm](https://img.shields.io/npm/v/use-m.svg)](https://npmjs.com/use-m)
[![License](https://img.shields.io/badge/license-Unlicense-blue.svg)](https://github.com/link-foundation/use-m/blob/main/LICENSE)

[![Open in Gitpod](https://img.shields.io/badge/Gitpod-ready--to--code-f29718?logo=gitpod)](https://gitpod.io/#https://github.com/link-foundation/use-m)
[![Open in GitHub Codespaces](https://img.shields.io/badge/GitHub%20Codespaces-Open-181717?logo=github)](https://github.com/codespaces/new?hide_repo_select=true&ref=main&repo=link-foundation/use-m)

# [use-m](https://github.com/link-foundation/use-m): dynamically import any JavaScript module anywhere

`use-m` (`m` stands for `module`) is a utility for dynamically importing any JavaScript module (npm package) at runtime anywhere (browser or server). 

It may be useful for standalone scripts that do not require a `package.json`. Also it may make your code portable across environments (for example it may require no changes in your code when executed in CommonJS, ES Modules and browser). You can ensure predictable behavior of your code over time by specifying the exact version to import directly in your script, similar to how versions are specified in package.json. You even can import multiple versions of the same library at the same time. You can use `use-m` when you don't want your `package.json` to be poluted with optional packages. You may keep your `package.json` with as little dependencies as needed thanks to `use-m`.

<img width="2680" height="2928" alt="ray-so-export-2" src="https://github.com/user-attachments/assets/97909db5-b253-4493-81b8-ee6b6d68b00f" />

## Table of Contents
- [use-m: dynamically import any JavaScript module anywhere](#use-m-dynamically-import-any-javascript-module-anywhere)
  - [Table of Contents](#table-of-contents)
  - [Key features](#key-features)
  - [Usage](#usage)
    - [Universal](#universal)
    - [Interactive shell in Node.js environment](#interactive-shell-in-nodejs-environment)
    - [Browser](#browser)
    - [Deno](#deno)
    - [Bun](#bun)
    - [Network imports](#network-imports)
    - [Independent Scripts](#independent-scripts)
      - [`use-m` and `command-stream`](#use-m-and-command-stream)
      - [`use-m` and Bun.$](#use-m-and-bun)
      - [`use-m` and `zx`](#use-m-and-zx)
      - [`use-m` and `execa`](#use-m-and-execa)
    - [Standard Import](#standard-import)
      - [Installation](#installation)
      - [CommonJS](#commonjs)
      - [ES Modules](#es-modules)
  - [Examples](#examples)
  - [Questions and issues](#questions-and-issues)
  - [Contributing](#contributing)
  - [License](#license)

## Key features

- **Dynamic package loading**: In `node.js`, `use-m` loads and imports npm packages on-demand with **global installation** (using `npm i -g` with separate alias for each version), making them available across projects and reusable without needing to reinstall each time. In case of a browser `use-m` loads npm packages directly from CDNs (by default `esm.sh` is used).
- **Version-safe imports**: Allows multiple versions of the same library to coexist without conflicts, so you can specify any version for each import (usage) without affecting other scripts or other usages (imports) in the same script.
- **No more `require`, `import`, or `package.json`**: With `use-m`, traditional module loading approaches like `require()`, `import` statements, and `package.json` dependencies become effectively obsolete. You can dynamically load any module at runtime without pre-declaring dependencies in separate file. This enables truly self-contained `.mjs` files that can effectively replace shell scripts.
- **Built-in modules emulation**: Provides emulation for Node.js built-in modules across all environments (browser, Node.js, Bun, Deno), ensuring consistent behavior regardless of the runtime.
- **Relative path resolution**: Supports `./ ` and `../` paths for loading local JavaScript and JSON files relative to the executing file, working seamlessly even in browser environments.

## Usage

### Universal

Works in CommonJS, ES Modules and browser, and interactive environments.

```javascript
fetch('https://unpkg.com/use-m/use.js')
  .then(async useJs => {
    const { use } = eval(await useJs.text());
    const _ = await use('lodash@4.17.21');
    console.log(`_.add(1, 2) = ${_.add(1, 2)}`);
  });
```

Universal execution comes at cost of `eval` usage, that is considered potential security threat. In case of this library only single file is evaled, it short, unminified and has no dependencies, so you can check [the contents](https://unpkg.com/use-m/use.js) yourself. Once you have `use` function instance no more `eval` function will be executed by this library. If you don't want to use `eval` you can use `await import()` in browser or in `node.js`. In `node.js` you can also just install the package from `npm` as usual.

### Interactive shell in Node.js environment

1. Get the `use` function from `use-m` package:

   Single line version:

   ```javascript
   const { use } = eval(await (await fetch('https://unpkg.com/use-m/use.js')).text());
   ```

   <img width="778" height="420" alt="Screenshot 2025-07-25 at 2 21 28 AM" src="https://github.com/user-attachments/assets/f37692dc-0c2e-4279-8f71-1cde37176c1f" />

   Formatted multiple version:

   ```javascript
   const { use } = eval(
     await (
       await fetch(
         'https://unpkg.com/use-m/use.js'
       )
     ).text()
   );
   ```


2. Import your favorite NPM package from the registry (for example `lodash`):
   ```javascript
   const _ = await use('lodash@4.17.21');
   ```

3. Use your favorite function from dynamically imported package (for example `add`):
   ```javascript
   _.add(1, 2)
   ```

Your output should be similar to the next screenshot.

<img width="830" alt="Screenshot 2025-02-19 at 1 58 57 AM" src="https://github.com/user-attachments/assets/0ef7d4e2-f2b6-4998-87a7-5a697877f2d0" />

### Browser

If you don't want to use `eval` in the browser, you can import `use-m` like this:

```javascript
const { use } = await import("https://esm.sh/use-m");
const _ = await use('lodash@4.17.21');
console.log(`_.add(1, 2) = ${_.add(1, 2)}`);
```

Only 2 lines and now have an interactive playground for JavaScript and almost any NPM library directly in your browser's console. No more cloud based sandboxes required. Sorry VSCode, you don't have such super powers yet.

### Deno

`use-m` works seamlessly with Deno! It automatically detects the Deno runtime and uses `esm.sh` as the default CDN.

```javascript
// Import use-m from CDN
const { use } = await import('https://esm.sh/use-m');

// Use any npm package
const _ = await use('lodash@4.17.21');
console.log(`_.add(1, 2) = ${_.add(1, 2)}`);

// Import multiple packages
const [lodash3, lodash4] = await use.all('lodash@3', 'lodash@4');
```

Run with Deno:
```bash
deno run --allow-net example.mjs
```

### Bun

`use-m` works seamlessly with Bun! It automatically detects the Bun runtime and provides optimized module loading.

```javascript
// Import use-m from CDN
const { use } = await import('https://esm.sh/use-m');

// Use any npm package
const _ = await use('lodash@4.17.21');
console.log(`_.add(1, 2) = ${_.add(1, 2)}`);

// Import multiple packages
const [lodash3, lodash4] = await use.all('lodash@3', 'lodash@4');
```

Run with Bun:
```bash
bun run example.mjs
```

### Network imports

It is possible to use `--experimental-network-imports` to enable the same style of imports as in browser version. See [the example](https://github.com/link-foundation/use-m/blob/main/examples/network-imports/index.mjs).

1. Create file named `example.mjs`:
   ```javascript
   const { use } = await import('https://unpkg.com/use-m/use.mjs');
   const _ = await use('lodash@4.17.21');
   console.log(`_.add(1, 2) = ${_.add(1, 2)}`);
   ```

2. Execute the script using `--experimental-network-imports` option:
   ```bash
   node --experimental-network-imports example.mjs
   ```

### Independent Scripts

If you need to use `use-m` without adding it to a project locally, you can load it directly from `unpkg` using `fetch`. This is particularly useful for creating self-contained scripts without any `package.json`, `node_modules`, etc.

#### `use-m` and `command-stream`

[command-stream](https://github.com/link-foundation/command-stream) is a modern shell utility library with streaming, async iteration, and EventEmitter support. It provides the most advanced command execution capabilities including virtual commands, built-in cross-platform commands, and real-time streaming.

1. Create a file named `example.mjs`:

   ```javascript
   const { use } = eval(
     await fetch('https://unpkg.com/use-m/use.js').then(u => u.text())
   );
   
   const { $ } = await use('command-stream');
   const _ = await use('lodash');
   
   // Use command-stream's advanced features
   for await (const chunk of $`ls -la`.stream()) {
     if (chunk.type === 'stdout') {
       const files = chunk.data.toString();
       console.log('Files:', _.filter(files.split('\n'), f => f.includes('.js')));
     }
   }
   
   // Built-in cross-platform commands
   await $`mkdir -p build`;
   await $`echo "Build complete" > build/status.txt`;
   ```

2. Execute:

   ```bash
   node example.mjs
   ```

#### `use-m` and Bun.$

Bun provides a built-in `$` shell API that works seamlessly with `use-m`:

1. Create a file named `example.mjs`:

   ```javascript
    #!/usr/bin/env bun

   const { use } = eval(
     await fetch('https://unpkg.com/use-m/use.js').then(u => u.text())
   );
   
   const _ = await use('lodash');
   
   // Use Bun's built-in $ directly
   const { stdout } = await $`ls`.pipe($`grep js`);
   const files = _.filter(
     _.split(stdout.toString(), '\n'),
     (item) => !_.isEmpty(item)
   );
   console.log(files);
   ```

2. Execute with Bun:

   ```bash
   bun run example.mjs
   ```

#### `use-m` and `zx`

1. Install zx globally

   ```bash
   npm install -g zx
   ```

2. Create a file named `example.mjs`:

   ```javascript
   #!/usr/bin/env zx --verbose
   
   const { use } = eval(
     await fetch('https://unpkg.com/use-m/use.js').then(u => u.text())
   );
    
   const _ = await use('lodash@latest');
   
   const { stdout } = await $`ls`.pipe`grep js`;
   const files = _.filter(
     _.split(stdout, '\n'),
     (item) => !_.isEmpty(item)
   );
   console.log(files);
   ```

3. Give execution permissions

   ```bash
   chmod +x example.mjs
   ```

4. Execute:

   ```bash
   ./example.mjs
   ```

#### `use-m` and `execa`

1. Create a file named `example.mjs`:

   ```javascript
   #!/usr/bin/env node

   const { use } = eval(
     await fetch('https://unpkg.com/use-m/use.js').then(u => u.text())
   ); 
   
   const _ = await use('lodash');
   const { $: $$ } = await use('execa');
   const $ = $$({ verbose: 'full' }); 
   
   const { stdout } = await $`ls`.pipe`grep js`;
   const files = _.filter(
     _.split(stdout, '\n'),
     (item) => !_.isEmpty(item)
   );
   console.log(files);
   ```

Note: in ES Module environments where `__filename` and `require` are not defined, you may need to add `meta` option into `use` function constructor, as it is not possible to access `import.meta` inside `eval`.

2. Execute:

   ```bash
   node example.mjs
   ```

### Standard Import

You can still install and import `use-m` in `node.js` as usual. For example if you don't want to use `eval` in `node.js`.

#### Installation

Add `use-m` to your project with Yarn:

```bash
yarn add use-m
```

Or NPM:

```bash
npm i use-m
```

Load `use-m` to dynamically import the `lodash` package from npm:

#### CommonJS

```javascript
const { use } = require('use-m');

(async () => {
  const _ = await use('lodash@4.17.21');
  console.log(`_.add(1, 2) = ${_.add(1, 2)}`);
})();
```

or

```javascript
import('use-m')
  .then(async ({ use }) => {
    const _ = await use('lodash@4.17.21');
    console.log(`_.add(1, 2) = ${_.add(1, 2)}`);
  });
```

#### ES Modules

```javascript
import { use } from 'use-m';

const _ = await use('lodash@4.17.21');
console.log(`_.add(1, 2) = ${_.add(1, 2)}`);
```

or

```javascript
const { use } = await import('use-m');

const _ = await use('lodash@4.17.21');
console.log(`_.add(1, 2) = ${_.add(1, 2)}`);
```

## Examples

You can check out [usage examples source code](https://github.com/link-foundation/use-m/tree/main/examples). You can also explore our [tests](https://github.com/link-foundation/use-m/tree/main/tests) to get even more examples.

## Questions and issues

If you have any questions or issues, [please write us on GitHub](https://github.com/link-foundation/use-m/issues). Together we can ensure this package will have highest quality possible. Your feedback is valuable and helps improve the project.

## Contributing

We welcome contributions! To contribute please [open Pull Request](https://github.com/link-foundation/use-m/pulls) with any suggested changes.

## License

This project is licensed under the [Unlicense](https://github.com/link-foundation/use-m/blob/main/LICENSE) (public domain). That means you are absolutely free to use this library, there is no conditions or limitations on how this library and its code can be used.
