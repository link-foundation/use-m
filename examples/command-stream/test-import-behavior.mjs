// Test how Bun vs Node handle use-m import behavior
import { readFile } from 'fs/promises';

console.log('=== USE-M IMPORT BEHAVIOR TEST ===');
console.log('Runtime:', typeof Bun !== 'undefined' ? 'Bun' : 'Node.js');
console.log();

async function testUseMBehavior() {
  const tests = [
    { name: 'eval pattern', loader: () => eval(readFile('../../use.js', 'utf8')) },
    { name: 'use.cjs', loader: () => import('../../use.cjs') },
    { name: 'use.mjs', loader: () => import('../../use.mjs') },
    { name: 'use-m package', loader: () => import('use-m') },
  ];
  
  for (const test of tests) {
    console.log(`--- Testing: ${test.name} ---`);
    try {
      const loaderResult = await test.loader();
      const { use } = test.name === 'eval pattern' ? eval(await readFile('../../use.js', 'utf8')) : loaderResult;
      const module = await use('command-stream');
      
      console.log('  Success!');
      console.log('  Type:', typeof module);
      console.log('  Keys:', Object.keys(module).slice(0, 3));
      console.log('  Has $:', module.$ !== undefined);
      console.log('  Has default:', module.default !== undefined);
      
      // Check what the actual value is
      if (typeof module === 'function') {
        console.log('  Module is a function, name:', module.name);
      }
      
      // Check Symbol.toStringTag
      if (module[Symbol.toStringTag]) {
        console.log('  Symbol.toStringTag:', module[Symbol.toStringTag]);
      }
      
      // Try to see the actual structure
      if (module.default && typeof module.default === 'function') {
        console.log('  default.name:', module.default.name);
      }
    } catch (error) {
      console.log('  ERROR:', error.message);
    }
    console.log();
  }
  
  console.log('--- Special test: Compare different use-m methods ---');
  try {
    const { use: useEval } = eval(await readFile('../../use.js', 'utf8'));
    const { use: useCjs } = await import('../../use.cjs');
    
    const m1 = await useEval('command-stream');
    const m2 = await useCjs('command-stream');
    
    console.log('Are results the same?', m1 === m2);
    console.log('m1 type:', typeof m1);
    console.log('m2 type:', typeof m2);
    console.log('m1 has $:', m1.$ !== undefined);
    console.log('m2 has $:', m2.$ !== undefined);
  } catch (error) {
    console.log('ERROR:', error.message);
  }
}

testUseMBehavior().then(() => {
  console.log('=== END TEST ===');
});