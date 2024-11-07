# use-m: dynamically import any JavaScript module

`use-m` is a utility for dynamically installing and importing any npm package at runtime. It’s ideal for scripts that need flexibility in package management, such as automation tasks, serverless functions, or any scripts that benefit from dynamic dependencies.

## Key Features

- **Dynamic Package Loading**: Installs and loads npm packages on-demand with **global installation**, making them available across projects and reusable without needing to reinstall each time.
- **Version-Safe Imports**: Allows multiple versions of the same library to coexist globally without conflicts, so you can specify any version without affecting other scripts.

## Installation

Add `use-m` to your project with Yarn:

```bash
yarn add use-m
```

Or NPM:

```bash
npm install use-m
```

## Usage

### Standard Import

Load `use-m` to dynamically import a package from npm:

#### CommonJS

```javascript
const { use } = require('use-m');

(async () => {
  const _ = await use('lodash@4.17.21');
  console.log(_.chunk([1, 2, 3, 4, 5], 2));
})()
```

#### ES Modules

```javascript
import { use } from 'use-m';

const _ = await use('lodash@4.17.21');
console.log(_.chunk([1, 2, 3, 4, 5], 2));
```

### Remote Fetch for Independent Scripts

If you need to use `use-m` without adding it to a project or prefer a completely independent setup, you can load it directly from GitHub using `fetch`. This is particularly useful in environments like [zx](https://github.com/google/zx) or in standalone scripts.

#### ES Modules (`.mjs`)

```javascript
const use = await fetch('https://unpkg.com/use-m/src/use.mjs')
  .then(response => response.text())
  .then(code => eval(code));

const _ = await use('lodash@4.17.21');
console.log(_.chunk([1, 2, 3, 4, 5], 2));
```

#### CommonJS (`.cjs`)

For a CommonJS environment, you can fetch the CommonJS module version:

```javascript
(async () => {
  const use = await fetch('https://unpkg.com/use-m/src/use.cjs')
  .then(response => response.text())
  .then(code => eval(code));

  const _ = await use('lodash@4.17.21');
  console.log(_.chunk([1, 2, 3, 4, 5], 2));
})()
```

## `use-m` and `zx`

0. Install zx globally

  ```bash
  npm install -g zx
  ```

1. Create a file named `example.mjs`:

  ```js
  #!/usr/bin/env zx --verbose
  
  const use = await fetch('https://unpkg.com/use-m/src/use.mjs')
    .then(response => response.text())
    .then(code => eval(code));
  
  const _ = await use('lodash@latest');

  const { stdout } = await $`ls`.pipe`grep js`;
  const files = _.filter(_.split(stdout, '\n'), (item) => !_.isEmpty(item));
  console.log(files);
  ```

2. Give execution permissions

  ```bash
  chmod +x example.mjs
  ```

3. Execute:

  ```bash
  ./example.mjs
  ```

## `use-m` and `execa`

1. Create a file named `example.mjs`:

  ```js
  const use = await fetch('https://unpkg.com/use-m/src/load-use.mjs')
    .then((response) => response.text())
    .then((code) => eval(code)());
  
  const _ = await use('lodash@latest');
  const { $: $$ } = await use('execa@latest');
  const $ = $$({ verbose: 'full' });

  const { stdout } = await $`ls`.pipe`grep js`;
  const files = _.filter(_.split(stdout, '\n'), (item) => !_.isEmpty(item));
  console.log(files);
  ```

2. Execute:

  ```bash
  node example.mjs
  ```

## License

This project is licensed under the Unlicense.
