// Smoke test: verify the eval'd use.js build performs multi-mirror fallback and
// produces a clear aggregated error when every mirror fails (issue #58 reuse).
const fs = require('fs');
const makeUse = eval(fs.readFileSync(__dirname + '/../src/use.js', 'utf8'));

(async () => {
  // 1) Multi-mirror fallback: first resolver's import fails, second succeeds.
  const use = await makeUse({
    specifierResolvers: [async (s) => 'm1://' + s, async (s) => 'm2://' + s],
    import: async (url) => { if (url.startsWith('m1')) throw new Error('m1 down'); return { from: url }; },
  });
  const r = await use('lodash@4.17.21');
  console.log('1) fallback result:', JSON.stringify(r));

  // 2) Every mirror fails -> ONE aggregated, actionable error.
  const use2 = await makeUse({
    specifierResolvers: ['esm', 'jspm', 'skypack'],
    import: async (url) => { throw new Error('down: ' + url); },
  });
  try {
    await use2('left-pad@1.3.0');
    console.log('2) ERROR: expected a throw');
  } catch (e) {
    console.log('2) aggregated first line:', e.message.split('\n')[0]);
    console.log('   lists esm/jspm/skypack URLs:',
      e.message.includes('https://esm.sh/left-pad@1.3.0') &&
      e.message.includes('jspm') && e.message.includes('skypack'));
  }
})();
