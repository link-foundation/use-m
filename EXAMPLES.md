# Examples

Start with the [README quickstart](README.md) for installation or the [resolution guide](README.md#how-it-works) for runtime requirements.

| If you want to | Try |
| --- | --- |
| Run a standalone Node.js script | [Fetch and load the standalone bundle](examples/readme/main-example.mjs) |
| Use an installed package | [Node.js ESM](examples/mjs/index.js) or [CommonJS](examples/cjs/index.js) |
| Load dependencies in Deno or Bun | [Deno example](examples/deno/example.mjs) or [Bun quickstart](README.md#bun) |
| Compare two releases in one process | [Multiple versions](#load-two-versions-in-one-script) |
| Load JavaScript and JSON relative to the caller | [Relative path examples](examples/relative-paths/) |
| Call a package's default function and use its named exports | [Axios example](README.md#module-shapes-and-package-subpaths) |
| Retry a failed source and fall back to a mirror | [CDN bootstrap and fallback examples](examples/load/) |
| Select packages compatible with the running Node.js | [Node.js engine selection example](examples/npm-engines/example.mjs) |
| Resolve versioned static imports through Node.js's loader hook | [Loader hook example](README.md#nodejs-loader-hook) |

## Load two versions in one script

Install `use-m` with `npm install use-m`. Save this as `compare.mjs` and run `node compare.mjs`. Each exact version gets its own npm alias, so both can run in the same process.

```javascript
import { use } from 'use-m';

const [lodash3, lodash4] = await use.all('lodash@3.10.1', 'lodash@4.17.21');
console.log(lodash3.VERSION, lodash4.VERSION); // 3.10.1 4.17.21
```

## Try an npm package in a browser

1. Serve a local page from a directory you control, for example with `python3 -m http.server 8000`. Open `http://localhost:8000/` and use its developer console on a disposable page. Pages that restrict which scripts can be loaded may block CDN imports.
2. Load `use-m` directly as a browser module.
   ```js
   const { use } = await import("https://esm.sh/use-m");
   ```
3. Load a pinned release of `d3` from the CDN.
   ```js
   const d3 = await use('d3@7.9.0');
   ```
4. Replace the page body with an SVG.
   ```js
   document.body.innerHTML = '<svg></svg>';
   ```
5. Draw a curved arrow.
   ```js
   const svg = d3.select("svg")
     .attr("width", "100%")
     .attr("height", "100%")
     .attr("viewBox", "0 0 220 220");

   svg.append("defs").append("marker")
     .attr("id", "arrow")
     .attr("markerWidth", 20)
     .attr("markerHeight", 20)
     .attr("refX", 10)
     .attr("refY", 6)
     .attr("orient", "auto")
     .append("path")
     .attr("d", "M0,0 L0,12 L12,6 Z")
     .attr("fill", "white");

   svg.append("path")
     .attr("d", "M10,10 Q100,200 200,10")
     .attr("stroke", "white")
     .attr("fill", "none")
     .attr("marker-end", "url(#arrow)");
   ```

   <img width="1840" alt="Screenshot 2024-11-15 at 23 28 22" src="https://github.com/user-attachments/assets/8149d619-dca3-4243-97a1-379cb2b6575c">

## Activate IntelliSense in VS Code

1. Install `use-m` and Lodash's type declarations in your project. The declarations power autocomplete while `use-m` loads the JavaScript at runtime.
   ```bash
   yarn add use-m
   yarn add --dev @types/lodash
   ```
   or
   ```bash
   npm install use-m
   npm install --save-dev @types/lodash
   ```

2. Create a file named `example.mjs`
   ```javascript
   import { use } from 'use-m';

   /** @type {import('lodash')} */
   const _ = await use('lodash@4.17.21');

   console.log(`_.add(1, 2) = ${_.add(1, 2)}`);
   ```

3. Type `_.` in VS Code to see members of `_`. Run `node example.mjs` to print `_.add(1, 2) = 3`.

   <img width="618" alt="VS Code showing Lodash completion suggestions" src="https://github.com/user-attachments/assets/967c05ba-7977-4a08-a4d2-76ab6cf31e25">
