// Probes whether the callback-style `node:fs` exports carry Node-accurate
// arities in Bun and Deno. If they do, the hardcoded arity table inside the
// `fs/promises` override (issue #50) can be derived at runtime instead.
//
// Run with: node experiments/fs-promises-arity-probe.mjs
//           bun experiments/fs-promises-arity-probe.mjs
//           deno run --allow-all experiments/fs-promises-arity-probe.mjs
const runtime = typeof Bun !== 'undefined' ? 'Bun' : typeof Deno !== 'undefined' ? 'Deno' : 'Node.js';
const fs = await import('node:fs');
const fsp = await import('node:fs/promises');

// Node.js reference: promise arity === callback arity - 1.
const names = Object.keys(fsp).filter((name) => typeof fsp[name] === 'function').sort();

console.log(`runtime: ${runtime}`);
console.log('name           cb.len  promise.len  cb.len-1  promise.ctor');
for (const name of names) {
  const cb = fs[name];
  console.log(
    name.padEnd(14),
    String(typeof cb === 'function' ? cb.length : '-').padStart(6),
    String(fsp[name].length).padStart(12),
    String(typeof cb === 'function' ? cb.length - 1 : '-').padStart(9),
    ' ' + fsp[name].constructor.name
  );
}
