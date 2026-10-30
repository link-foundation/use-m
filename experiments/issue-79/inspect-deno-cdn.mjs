// Diagnose CDN import failures without hiding their underlying causes.
// Run: deno run --allow-all experiments/issue-79/inspect-deno-cdn.mjs
for (const url of [
  'https://esm.sh/command-stream@0.0.5',
  'https://esm.sh/lodash@4.17.21/add',
  'https://jspm.dev/command-stream@0.0.5',
  'https://cdn.skypack.dev/command-stream@0.0.5',
]) {
  try {
    const loaded = await import(url);
    console.log('OK', url, Object.keys(loaded));
  } catch (error) {
    console.error('FAILED', url, error);
  }
}
