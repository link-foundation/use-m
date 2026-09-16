// Experiment for issue #50: can a single generic loader replace the hardcoded
// per-module `supportedBuiltins` factories?
//
// The generic loader mirrors what every hardcoded factory did:
//   const m = await import(`node:${name}`); return { default: m, ...m };
// Note `...m` runs *after* `default: m`, so a module namespace that exposes a
// `default` export (every CJS builtin does) wins — which is exactly what the
// per-module overrides were spelling out by hand.
//
// Run with: node experiments/generic-builtin-loader.mjs
//           bun experiments/generic-builtin-loader.mjs
//           deno run -A experiments/generic-builtin-loader.mjs

const load = async (name) => {
  const m = await import(`node:${name}`);
  return { default: m, ...m };
};

const runtime = typeof Deno !== 'undefined' ? 'Deno' : typeof Bun !== 'undefined' ? 'Bun' : 'Node.js';
console.log(`runtime: ${runtime}`);

const checks = [
  ['events', async (m) => m.default === m.EventEmitter, 'default === EventEmitter'],
  ['stream', async (m) => m.default === m.Stream, 'default === Stream'],
  ['buffer', async (m) => typeof m.Buffer === 'function', 'Buffer is a function'],
  ['assert', async (m) => typeof m.default === 'function' && typeof m.strictEqual === 'function', 'default is callable assert'],
  ['console', async (m) => typeof m.log === 'function', 'console.log present'],
  ['crypto', async (m) => typeof m.randomUUID === 'function', 'randomUUID present'],
  ['url', async (m) => typeof m.URL === 'function', 'URL present'],
  ['process', async (m) => m.default === process && m.pid === process.pid, 'default === process global'],
  ['fs', async (m) => typeof m.readFileSync === 'function', 'readFileSync present'],
  ['fs/promises', async (m) => typeof m.readFile === 'function' && m.readFile.length === 2, 'readFile arity 2'],
  ['path', async (m) => typeof m.join === 'function', 'join present'],
  ['util', async (m) => typeof m.promisify === 'function', 'promisify present'],
  ['perf_hooks', async (m) => typeof m.performance?.now === 'function', 'performance.now present'],
  ['timers/promises', async (m) => typeof m.setTimeout === 'function', 'setTimeout present'],
  ['dns/promises', async (m) => typeof m.lookup === 'function', 'lookup present'],
  ['stream/promises', async (m) => typeof m.pipeline === 'function', 'pipeline present'],
  ['readline/promises', async (m) => typeof m.createInterface === 'function', 'createInterface present'],
  ['tty', async (m) => typeof m.isatty === 'function', 'isatty present'],
  ['cluster', async (m) => typeof m.default === 'object', 'default object'],
  ['string_decoder', async (m) => typeof m.StringDecoder === 'function', 'StringDecoder present'],
  ['worker_threads', async (m) => 'isMainThread' in m, 'isMainThread present'],
  ['vm', async (m) => typeof m.runInNewContext === 'function', 'runInNewContext present'],
  ['zlib', async (m) => typeof m.gzipSync === 'function', 'gzipSync present'],
  ['querystring', async (m) => typeof m.parse === 'function', 'parse present'],
];

let failures = 0;
for (const [name, check, label] of checks) {
  try {
    const m = await load(name);
    const ok = await check(m);
    if (!ok) failures++;
    console.log(`${ok ? 'PASS' : 'FAIL'} ${name.padEnd(20)} ${label}`);
  } catch (error) {
    failures++;
    console.log(`ERR  ${name.padEnd(20)} ${error.message}`);
  }
}

console.log(`\n${failures === 0 ? 'all generic loads behave as the hardcoded factories did' : `${failures} mismatch(es)`}`);
