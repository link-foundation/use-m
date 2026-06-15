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

console.log('\nConclusion: restoring root use.js/use.cjs/use.mjs (mirrors of src/) makes');
console.log('https://unpkg.com/use-m/use.js resolve again, so every existing consumer keeps working.');
