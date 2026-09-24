// Issue #76: loading every built-in module (tests/dynamic-builtins.test.*)
// printed DEP0025/DEP0125/DEP0192 deprecation warnings and a WASI
// ExperimentalWarning into every CI log. This probe shows which runtimes route
// those warnings through process.emitWarning, i.e. whether a scoped override
// can keep the deliberate loads quiet.
//
// Usage: node|bun|deno run -A experiments/issue-76-builtin-warnings.mjs [--quiet]
import { builtinModules } from 'node:module';
import process from 'node:process';

const quiet = process.argv.includes('--quiet');
const captured = [];
const originalEmitWarning = process.emitWarning;
if (quiet) {
  process.emitWarning = (warning, ...rest) => {
    captured.push(typeof warning === 'string' ? warning : warning?.message);
  };
}
try {
  for (const name of builtinModules) {
    try {
      await import(`node:${name}`);
    } catch {}
  }
} finally {
  process.emitWarning = originalEmitWarning;
}
console.log(`loaded ${builtinModules.length} built-ins; captured ${captured.length} warnings`);
for (const message of captured) console.log(`  captured: ${message}`);
