// Experiment for issue #50: how many of the built-ins the runtime reports are
// actually claimed by use-m's `builtin` resolver?
//
// A specifier is "claimed" when the resolver returns a module (or throws while
// loading it). Returning `null` means use-m does not consider it a built-in and
// hands it to the npm/CDN resolvers, which is how `use('tty')` used to end up
// trying to install a package named `tty` from npm.
//
// Run with: node experiments/builtin-coverage.mjs [path-to-use.mjs]
//   default: ../src/use.mjs relative to this file
import { builtinModules } from 'node:module';
import { pathToFileURL } from 'node:url';

const target = process.argv[2]
  ? pathToFileURL(process.argv[2]).href
  : new URL('../src/use.mjs', import.meta.url).href;

const { resolvers } = await import(target);

const claimed = [];
const unclaimed = [];
for (const name of builtinModules) {
  const result = await resolvers.builtin(name).catch((error) => error);
  (result === null ? unclaimed : claimed).push(name);
}

console.log(`source: ${target}`);
console.log(`runtime reports ${builtinModules.length} built-in modules`);
console.log(`claimed by the builtin resolver: ${claimed.length}`);
console.log(`handed off to npm/CDN resolvers:  ${unclaimed.length}`);
if (unclaimed.length > 0) {
  console.log(unclaimed.join(', '));
}
