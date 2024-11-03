# use: dynamically install and import any npm package

`use` is a utility for dynamically installing and importing any npm package at runtime. It’s ideal for scripts that need flexibility in package management, such as automation tasks, serverless functions, or any scripts that benefit from dynamic dependencies.

## Key Features

- **Dynamic Package Loading**: Installs and loads npm packages on-demand with **global installation**, making them available across projects and reusable without needing to reinstall each time.
- **Version-Safe Imports**: Allows multiple versions of the same library to coexist globally without conflicts, so you can specify any version without affecting other scripts.

## Installation

Add `use` to your project with Yarn:

```bash
yarn add @konard/use
```

Or NPM:

```bash
npm install @konard/use
```

## Usage

### Standard Import

Load `@konard/use` to dynamically import a package from npm:

#### CommonJS

```javascript
const { use } = require('@konard/use');
const _ = await use('lodash@4.17.21');
console.log(_.chunk([1, 2, 3, 4, 5], 2));
```

#### ES Modules

```javascript
import { use } from '@konard/use';
const _ = await use('lodash@4.17.21');
console.log(_.chunk([1, 2, 3, 4, 5], 2));
```

### Remote Fetch for Independent Scripts

If you need to use `@konard/use` without adding it to a project or prefer a completely independent setup, you can load it directly from GitHub using \`fetch\`. This is particularly useful in environments like \`[zx](https://github.com/google/zx)\` or in standalone scripts.

#### ES Modules (\`.mjs\`)

```javascript
const use = await fetch('https://raw.githubusercontent.com/konard/use/refs/heads/main/src/use.mjs')
  .then(response => response.text())
  .then(code => eval(code));

const _ = await use('lodash@4.17.21');
console.log(_.chunk([1, 2, 3, 4, 5], 2));
```

#### CommonJS (\`.cjs\`)

For a CommonJS environment, you can fetch the CommonJS module version:

```javascript
const use = await fetch('https://raw.githubusercontent.com/konard/use/refs/heads/main/src/use.cjs')
  .then(response => response.text())
  .then(code => eval(code));

const _ = await use('lodash@4.17.21');
console.log(_.chunk([1, 2, 3, 4, 5], 2));
```

## License

This project is licensed under the Unlicense.
