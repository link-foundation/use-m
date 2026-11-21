// Issue #81 probe (real network). Evaluates a use.js build the way the issue
// does (`eval(await (await fetch(url)).text())`) and prints what the thrown
// error exposes when every mirror fails.
//
// Usage:
//   deno run -A --no-lock experiments/issue-81/deno-probe.mjs [use.js URL or path] [package]
// Defaults: the local ./use.js and a package name that does not exist.
const target = Deno.args[0] ?? new URL('../../use.js', import.meta.url).href;
const specifier = Deno.args[1] ?? 'use-m-issue-81-package-that-does-not-exist';
const source = /^https?:/.test(target)
  ? await (await fetch(target)).text()
  : await Deno.readTextFile(target.startsWith('file:') ? new URL(target) : target);
const { use } = eval(source);
try {
  await use(specifier);
  console.log('loaded', specifier);
} catch (e) {
  console.log(e.message);
  console.log('---');
  console.log(e.name, Object.getOwnPropertyNames(e), e.errors?.length);
}
