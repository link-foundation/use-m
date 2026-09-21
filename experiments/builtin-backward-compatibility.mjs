#!/usr/bin/env node
// Compares the shape of every built-in that use-m used to hardcode against the
// shape produced by the dynamic resolver (issue #50), on whatever runtime it is
// started with. Prints one line per difference so a regression is visible
// instead of assumed.
//
// Usage: <runtime> experiments/builtin-backward-compatibility.mjs [baselineUseMjs]
//   baselineUseMjs defaults to /tmp/use-baseline.mjs
//   (git show main:src/use.mjs > /tmp/use-baseline.mjs)

const baselinePath = process.argv[2] || '/tmp/use-baseline.mjs';
const currentPath = new URL('../src/use.mjs', import.meta.url).href;

const { resolvers: baseline } = await import(baselinePath.startsWith('/') ? `file://${baselinePath}` : baselinePath);
const { resolvers: current } = await import(currentPath);

// Every key of `supportedBuiltins` on main, i.e. the full set of specifiers
// whose behaviour existing users can already depend on.
const previouslyHardcoded = [
  'console', 'crypto', 'url', 'performance',
  'fs', 'fs/promises', 'dns/promises', 'stream/promises', 'readline/promises',
  'timers/promises', 'path', 'os', 'util', 'events', 'stream', 'buffer',
  'process', 'child_process', 'http', 'https', 'net', 'dns', 'zlib',
  'querystring', 'assert'
];

const runtime = typeof Bun !== 'undefined' ? `Bun ${Bun.version}`
  : typeof Deno !== 'undefined' ? `Deno ${Deno.version.deno}`
  : `Node.js ${process.version}`;

const describeValue = (value) => {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  const type = typeof value;
  if (type === 'function') return `function:${value.name || '<anonymous>'}/${value.length}`;
  if (type === 'object') return `object:${value.constructor?.name || 'null-prototype'}`;
  return type;
};

const load = async (resolver, name) => {
  try {
    return { value: await resolver.builtin(name) };
  } catch (error) {
    return { error: error.message };
  }
};

let differences = 0;
const report = (name, message) => {
  differences += 1;
  console.log(`DIFF  ${name}: ${message}`);
};

for (const bare of previouslyHardcoded) {
  for (const name of [bare, `node:${bare}`]) {
    const before = await load(baseline, name);
    const after = await load(current, name);

    if (before.error || after.error) {
      if (before.error !== after.error) {
        report(name, `error changed: ${before.error ?? '(none)'} -> ${after.error ?? '(none)'}`);
      }
      continue;
    }
    if (before.value === null || after.value === null) {
      if (before.value !== after.value) {
        report(name, `claimed changed: ${before.value === null ? 'unclaimed' : 'claimed'} -> ${after.value === null ? 'unclaimed' : 'claimed'}`);
      }
      continue;
    }

    const beforeKeys = Object.keys(before.value);
    const afterKeys = new Set(Object.keys(after.value));
    const missing = beforeKeys.filter((key) => !afterKeys.has(key));
    if (missing.length > 0) {
      report(name, `keys missing after the change: ${missing.join(', ')}`);
    }

    for (const key of beforeKeys) {
      if (!afterKeys.has(key)) continue;
      const wasIdentical = before.value[key] === after.value[key];
      if (wasIdentical) continue;
      const beforeDescription = describeValue(before.value[key]);
      const afterDescription = describeValue(after.value[key]);
      if (beforeDescription !== afterDescription) {
        report(name, `'${key}' changed: ${beforeDescription} -> ${afterDescription}`);
      }
    }
  }
}

console.log(`\n${runtime}: ${previouslyHardcoded.length} previously hardcoded built-ins compared (bare + node: prefixed), ${differences} difference(s).`);
if (differences > 0) process.exitCode = 1;
