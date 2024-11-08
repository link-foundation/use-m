# use-m: dynamically import any JavaScript module

`use-m` (`m` stands for `module`) is a utility for dynamically importing any JavaScript module (npm package) at runtime. 

It may useful for standalone scripts that does not need `package.json`. Also it may make your code portable across environments (for example it may require no changes in your code when executed in CommonJS, ES Modules and browser). You also can have predictable behaviour of your code over time if you set specific version to import (that is usually set in `packge.json`, now you can set it right in the script). You even can import multiple versions of the same library at the same time.

## Key features

- **Dynamic package loading**: In `node.js` installs and loads npm packages on-demand with **global installation**, making them available across projects and reusable without needing to reinstall each time. In case of a browser `use-m` loads npm packages directly from CDNs.
- **Version-safe imports**: Allows multiple versions of the same library to coexist without conflicts, so you can specify any version for each import (usage) without affecting other scripts or other usages (imports) in the same script.

## Usage

### Universal

Works in CommonJS, ES Modules and browser environments.

```javascript
(async () => {
  const use = await fetch('https://unpkg.com/use-m/src/use.js')
    .then(response => response.text())
    .then(code => eval(code)());
  const _ = await use('lodash@4.17.21');
  const result = _.add(1, 2);
  console.log(result);
})()
```

In ES Modules and Browser you can omit async arrow function wrapper.

### Independent Scripts

If you need to use `use-m` without adding it to a project locally, you can load it directly from `unpkg` using `fetch`. This is particularly useful in environments like [zx](https://github.com/google/zx) or in standalone scripts, when you don't want to use any `package.json`, `node_modules`, etc.

#### `use-m` and `zx`

0. Install zx globally

  ```bash
  npm install -g zx
  ```

1. Create a file named `example.mjs`:

  ```js
  #!/usr/bin/env zx --verbose
  
  const use = await fetch('https://unpkg.com/use-m/src/use.js')
    .then(response => response.text())
    .then(code => eval(code)());
  
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

#### `use-m` and `execa`

1. Create a file named `example.mjs`:

  ```js
  const use = await fetch('https://unpkg.com/use-m/src/use.js')
    .then(response => response.text())
    .then(code => eval(code)({
      metaUrl: import.meta.url,
    }));

  const _ = await use('lodash@latest');
  const { $: $$ } = await use('execa@latest');
  const $ = $$({ verbose: 'full' });

  const { stdout } = await $`ls`.pipe`grep js`;
  const files = _.filter(_.split(stdout, '\n'), (item) => !_.isEmpty(item));
  console.log(files);
  ```

Note: in ES Module environments where `__filename` and `require` are not defined, you may need to add `metaUrl` option into `use` function constructor, as it is not possible to access `import.meta.url` inside `eval`.

2. Execute:

  ```bash
  node example.mjs
  ```

### Standard Import

You can still install and import `use-m` in `node.js` as usual.

#### Installation

Add `use-m` to your project with Yarn:

```bash
yarn add use-m
```

Or NPM:

```bash
npm i use-m
```

Load `use-m` to dynamically import a package from npm:

#### CommonJS

```javascript
const { use } = require('use-m');

(async () => {
  const _ = await use('lodash@4.17.21');
  console.log(_.add(1, 2));
})()
```

#### ES Modules

```javascript
import { use } from 'use-m';

const _ = await use('lodash@4.17.21');
console.log(_.add(1, 2));
```

## Questions and issues

If you have any questions or issues, please write out it on GitHub: [https://github.com/link-foundation/use-m/issues](https://github.com/link-foundation/use-m/issues). Together we can ensure this package will have highest quality possible.

## License

This project is licensed under the Unlicense.
