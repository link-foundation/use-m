// Import test to see how Bun vs Node handle command-stream via use-m
import { readFile } from 'fs/promises';

console.log('=== USE-M IMPORT TEST ===');
console.log('Runtime:', typeof Bun !== 'undefined' ? 'Bun' : 'Node.js');
console.log();

async function testUseMImport() {
  console.log('--- Test 1: Import command-stream via use-m ---');
  try {
    const { use } = eval(await readFile('../../use.js', 'utf8'));
    const module = await use('command-stream');
    console.log('Module type:', typeof module);
    console.log('Module keys:', Object.keys(module));
    console.log('Module.$ exists:', module.$ !== undefined);
    console.log('Module.default exists:', module.default !== undefined);
    
    if (module.default) {
      console.log('default type:', typeof module.default);
      console.log('default.name:', module.default.name);
    }
    
    if (module.$) {
      console.log('$ type:', typeof module.$);
      console.log('$.name:', module.$.name);
    }
    
    console.log('Full module:', module);
  } catch (error) {
    console.log('ERROR:', error.message);
  }
  console.log();
  
  console.log('--- Test 2: Import via different use-m variants ---');
  try {
    console.log('Testing CJS variant...');
    const { use: useCjs } = await import('../../use.cjs');
    const moduleCjs = await useCjs('command-stream');
    console.log('CJS - Module type:', typeof moduleCjs);
    console.log('CJS - Module.$ exists:', moduleCjs.$ !== undefined);
    
    console.log('Testing MJS variant...');
    const { use: useMjs } = await import('../../use.mjs');
    const moduleMjs = await useMjs('command-stream');
    console.log('MJS - Module type:', typeof moduleMjs);
    console.log('MJS - Module.$ exists:', moduleMjs.$ !== undefined);
  } catch (error) {
    console.log('ERROR:', error.message);
  }
}

testUseMImport().then(() => {
  console.log('=== END USE-M IMPORT TEST ===');
});