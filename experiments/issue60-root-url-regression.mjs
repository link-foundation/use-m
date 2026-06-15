// experiments/issue60-root-url-regression.mjs
//
// Reproduces the root cause of issue #60: after use-m@8.14.0 moved the entry
// files under /src, the long-standing bootstrap URL
//
//   https://unpkg.com/use-m/use.js
//
// resolves to a 404 whose plain-text body ("Not found: /use-m@8.14.0/use.js")
// gets eval()'d by consumers that do not check the HTTP status, producing the
// misleading "SyntaxError: Unexpected identifier 'found'".
//
// Run: node experiments/issue60-root-url-regression.mjs

import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

console.log('1) The exact 404 body unpkg returns for the legacy root URL:');
const notFoundBody = 'Not found: /use-m@8.14.0/use.js';
console.log(`   "${notFoundBody}"`);

console.log('\n2) What happens when a naive bootstrap eval()s that body:');
try {
  // This mirrors `eval(await (await fetch(url)).text())` in consumer bootstraps.
  // eslint-disable-next-line no-eval
  eval(notFoundBody);
  console.log('   (unexpected: eval did not throw)');
} catch (error) {
  console.log(`   ${error.constructor.name}: ${error.message}`);
  if (error instanceof SyntaxError && /found/.test(error.message)) {
    console.log('   -> matches the cryptic error reported in issue #60. ✓');
  }
}

console.log('\n3) Does a root-level use.js exist in the package layout?');
for (const file of ['use.js', 'use.cjs', 'use.mjs']) {
  const present = existsSync(path.join(root, file));
  console.log(`   ${file.padEnd(8)} at root: ${present ? 'present ✓' : 'MISSING ✗ (this is the regression)'}`);
}

console.log('\n4) The real module still lives under src/ and eval()s cleanly:');
const realSource = readFileSync(path.join(root, 'src', 'use.js'), 'utf8');
// eslint-disable-next-line no-eval
const exported = eval(realSource);
console.log(`   typeof src/use.js export.use = ${typeof exported.use} (expected: function)`);

console.log('\n5) Why FULL copies and not `require("./src/use.js")` shims?');
console.log('   The bootstrap fetches and eval()s use.js directly. A shim body fails');
console.log('   in exactly the contexts that bootstrap runs in:');
const shimBody = 'module.exports = require("./src/use.js");';
try {
  // The real failing consumer (hive-mind's use-m-bootstrap.lib.mjs) is ESM, where
  // neither `module` nor `require` exist — so the shim just swaps one cryptic
  // error for another instead of returning a working `use`.
  // eslint-disable-next-line no-eval
  const shimResult = eval(shimBody);
  console.log(`   shim eval (ESM scope) result: ${JSON.stringify(shimResult)} (no \`use\` ✗)`);
} catch (error) {
  console.log(`   shim eval (ESM scope) -> ${error.constructor.name}: ${error.message} ✗`);
}
console.log('   (In a browser it is `require is not defined`; in CJS with the wrong');
console.log('   CWD it is `Cannot find module`; even if it resolved, src/use.js has no');
console.log('   module.exports, so a shim yields {} — never a working `use`.)');

console.log('\nConclusion: restoring root use.js/use.cjs/use.mjs as FULL mirrors of src/');
console.log('makes https://unpkg.com/use-m/use.js resolve again AND eval() to a working');
console.log('`use`, so every existing consumer keeps working. Thin shims cannot.');
