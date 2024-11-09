# [use-m](https://github.com/link-foundation/use-m): dynamically import any JavaScript module

`use-m` (`m` stands for `module`) is a utility for dynamically importing any JavaScript module (npm package) at runtime. 

It may useful for standalone scripts that do not need `package.json`. Also it may make your code portable across environments (for example it may require no changes in your code when executed in CommonJS, ES Modules and browser). You can ensure predictable behavior of your code over time by specifying the exact version to import directly in your script, similar to how versions are specified in package.json. You even can import multiple versions of the same library at the same time.

## Key features

- **Dynamic package loading**: In `node.js`, `use-m` installs and loads npm packages on-demand with **global installation** (using `npm i -g` with separate alias for each version), making them available across projects and reusable without needing to reinstall each time. In case of a browser `use-m` loads npm packages directly from CDNs (by default `unpkg` is used).
- **Version-safe imports**: Allows multiple versions of the same library to coexist without conflicts, so you can specify any version for each import (usage) without affecting other scripts or other usages (imports) in the same script.

## Usage

### Universal

Works in CommonJS, ES Modules and browser environments.

```javascript
fetch('https://unpkg.com/use-m/use.js')
  .then(response => response.text())
  .then(code => eval(code)())
  .then(async (use) => {
    const _ = await use('lodash@4.17.21');
    console.log(`_.add(1, 2) = ${_.add(1, 2)}`);
  });
```

Universal execution comes at cost of `eval` usage, that is considered potential security threat. In case of this library only single file is evaled, it short and unminified, so you can check the contents yourself. Once you have `use` function instance no more `eval` function will be executed by this library. If you don't want to use `eval` you can use `await import()` in browser or in `node.js`. In `node.js` you can also just install the package from `npm` as usual.

### Browser

If you don't want to use `eval` in the browser, you can import `use-m` like this:

```javascript
const { use } = await import('https://unpkg.com/use-m/use.mjs');
const _ = await use('lodash@4.17.21');
console.log(`_.add(1, 2) = ${_.add(1, 2)}`);
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
  
  const response = await fetch('https://unpkg.com/use-m/use.js');
  const code = await response.text();
  const use = await eval(code)();
  
  const _ = await use('lodash@latest');

  const { stdout } = await $`ls`.pipe`grep js`;
  const files = _.filter(_.split(stdout, '\n'), (item) => !_.isEmpty(item));
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
  const use = await eval(
    await fetch('https://unpkg.com/use-m/use.js')
      .then(response => response.text())
  )({
    meta: import.meta,
  });

  const _ = await use('lodash@latest');
  const { $: $$ } = await use('execa@latest');
  const $ = $$({ verbose: 'full' });

  const { stdout } = await $`ls`.pipe`grep js`;
  const files = _.filter(_.split(stdout, '\n'), (item) => !_.isEmpty(item));
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
 .then(({ use }) => {
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

You can check out [usage examples source code](https://github.com/link-foundation/use-m/tree/main/examples).

## Questions and issues

If you have any questions or issues, [please write us on GitHub](https://github.com/link-foundation/use-m/issues). Together we can ensure this package will have highest quality possible. Your feedback is valuable and helps improve the project.

## License

This project is licensed under the [Unlicense](https://github.com/link-foundation/use-m/blob/main/LICENSE). That means there is no conditions and limitatios on how this library and its code can be used.
