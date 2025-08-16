[![npm](https://img.shields.io/npm/v/use-m.svg)](https://npmjs.com/use-m)
[![License](https://img.shields.io/badge/license-Unlicense-blue.svg)](https://github.com/link-foundation/use-m/blob/main/LICENSE)

# [use-m](https://github.com/link-foundation/use-m): dynamically import any JavaScript module anywhere

`use-m` (`m` stands for `module`) is a utility for dynamically importing any JavaScript module (npm package) at runtime anywhere (browser or server). 

It may be useful for standalone scripts that do not require a `package.json`. Also it may make your code portable across environments (for example it may require no changes in your code when executed in CommonJS, ES Modules and browser). You can ensure predictable behavior of your code over time by specifying the exact version to import directly in your script, similar to how versions are specified in package.json. You even can import multiple versions of the same library at the same time. You can use `use-m` when you don't want your `package.json` to be poluted with optional packages. You may keep your `package.json` with as little dependencies as needed thanks to `use-m`.

## Table of Contents
- [Introduction](#use-m-dynamically-load-and-import-any-javascript-module)
- [Key Features](#key-features)
- [Usage](#usage)
  - [Universal](#universal)
  - [Browser](#browser)
  - [Deno](#deno)
  - [Network Imports](#network-imports)
  - [Independent Scripts](#independent-scripts)
  - [Standard Import](#standard-import)
- [Examples](#examples)
- [Questions and issues](#questions-and-issues)
- [Contributing](#contributing)
- [License](#license)

## Key features

- **Dynamic package loading**: In `node.js`, `use-m` loads and imports npm packages on-demand with **global installation** (using `npm i -g` with separate alias for each version), making them available across projects and reusable without needing to reinstall each time. In case of a browser `use-m` loads npm packages directly from CDNs (by default `esm.sh` is used).
- **Version-safe imports**: Allows multiple versions of the same library to coexist without conflicts, so you can specify any version for each import (usage) without affecting other scripts or other usages (imports) in the same script.

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

If you need to use `use-m` without adding it to a project locally, you can load it directly from `unpkg` using `fetch`. This is particularly useful in environments like [zx](https://github.com/google/zx) or in other standalone scripts like `execa`, when you don't want to use any `package.json`, `node_modules`, etc.

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
