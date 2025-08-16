// Test what toString returns for Module objects in Bun vs Node
import { readFile } from 'fs/promises';

console.log('=== MODULE toString TEST ===');
console.log('Runtime:', typeof Bun !== 'undefined' ? 'Bun' : 'Node.js');
console.log();

async function testModuleToString() {
  const { use } = eval(await readFile('../../use.js', 'utf8'));
  const module = await use('command-stream');
  
  console.log('Module info:');
  console.log('  typeof module:', typeof module);
  console.log('  module.toString:', module.toString);
  console.log('  module.toString():', module.toString ? module.toString() : 'N/A - no toString method');
  console.log('  Object.prototype.toString.call(module):', Object.prototype.toString.call(module));
  console.log('  module[Symbol.toStringTag]:', module[Symbol.toStringTag]);
  console.log('  module.constructor.name:', module.constructor?.name);
  console.log();
  
  console.log('Keys analysis:');
  const keys = Object.keys(module);
  console.log('  All keys:', keys);
  console.log('  Has default:', module.default !== undefined);
  console.log('  typeof default:', typeof module.default);
  console.log();
  
  // Test the condition from baseUse
  console.log('baseUse condition tests:');
  console.log('  keys.length === 1 && keys[0] === "default":', 
    keys.length === 1 && keys[0] === 'default');
  
  const metadataKeys = new Set([
    'default', '__esModule', 'Symbol(Symbol.toStringTag)',
    'length', 'name', 'prototype', 'constructor',
    'toString', 'valueOf', 'hasOwnProperty', 'isPrototypeOf', 'propertyIsEnumerable'
  ]);
  
  const nonMetadataKeys = keys.filter(key => !metadataKeys.has(key));
  console.log('  Non-metadata keys:', nonMetadataKeys);
  console.log('  nonMetadataKeys.length === 0:', nonMetadataKeys.length === 0);
  
  console.log('  typeof module.default === "function":', typeof module.default === 'function');
  console.log('  module.toString:', module.toString);
  console.log('  module.toString().includes("[object Module]"):', 
    module.toString && module.toString().includes('[object Module]'));
  
  console.log();
  console.log('The problematic condition (line 467-470):');
  const wouldReturnDefault = (
    typeof module.default === 'function' &&
    module.toString &&
    module.toString().includes('[object Module]')
  );
  console.log('  Would return default?', wouldReturnDefault);
}

testModuleToString().then(() => {
  console.log('=== END TEST ===');
});