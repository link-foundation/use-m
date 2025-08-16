// Debug test for command-stream module import bug (Issue #31)
// Run with: bun debug-test.mjs or node debug-test.mjs

import { inspect } from 'util';
import { readFile } from 'fs/promises';

console.log('=== COMMAND-STREAM DEBUG TEST ===');
console.log('Runtime:', typeof Bun !== 'undefined' ? 'Bun' : 'Node.js');
console.log();

async function debugCommandStream() {
  console.log('--- Importing use-m via eval ---');
  const { use } = eval(await readFile('../../use.js', 'utf8'));
  console.log('use function:', typeof use);
  console.log();

  console.log('--- Attempting to import command-stream ---');
  const commandStreamModule = await use('command-stream');
  
  console.log('Full module object:');
  console.log(inspect(commandStreamModule, { depth: 3, colors: true }));
  console.log();
  
  console.log('Module type:', typeof commandStreamModule);
  console.log('Module keys:', Object.keys(commandStreamModule));
  console.log('Module prototype:', Object.getPrototypeOf(commandStreamModule));
  console.log('Is Module?:', commandStreamModule && commandStreamModule[Symbol.toStringTag] === 'Module');
  console.log();
  
  console.log('--- Checking for $ export ---');
  console.log('Has $ property:', Object.prototype.hasOwnProperty.call(commandStreamModule, '$'));
  console.log('$ value:', commandStreamModule.$);
  console.log('$ type:', typeof commandStreamModule.$);
  console.log();
  
  console.log('--- Checking for default export ---');
  console.log('Has default property:', Object.prototype.hasOwnProperty.call(commandStreamModule, 'default'));
  console.log('default value:', commandStreamModule.default);
  console.log('default type:', typeof commandStreamModule.default);
  
  if (commandStreamModule.default) {
    console.log('default keys:', Object.keys(commandStreamModule.default));
    console.log('default.$:', commandStreamModule.default.$);
  }
  console.log();
  
  console.log('--- Destructuring test ---');
  const { $ } = commandStreamModule;
  console.log('Destructured $:', $);
  console.log('Destructured $ type:', typeof $);
  console.log();
  
  console.log('--- Direct property access ---');
  console.log('commandStreamModule["$"]:', commandStreamModule['$']);
  
  console.log();
  console.log('--- All enumerable properties ---');
  for (const key in commandStreamModule) {
    console.log(`  ${key}:`, commandStreamModule[key]);
  }
  
  console.log();
  console.log('--- All own property names (including non-enumerable) ---');
  const allProps = Object.getOwnPropertyNames(commandStreamModule);
  console.log('Property names:', allProps);
  
  for (const prop of allProps) {
    const descriptor = Object.getOwnPropertyDescriptor(commandStreamModule, prop);
    console.log(`  ${prop}:`, {
      value: descriptor.value,
      enumerable: descriptor.enumerable,
      configurable: descriptor.configurable,
      writable: descriptor.writable
    });
  }
  
  console.log();
  console.log('--- Symbol properties ---');
  const symbols = Object.getOwnPropertySymbols(commandStreamModule);
  console.log('Symbols:', symbols.map(s => s.toString()));
  for (const sym of symbols) {
    console.log(`  ${sym.toString()}:`, commandStreamModule[sym]);
  }
}

debugCommandStream().catch(err => {
  console.error('ERROR:', err);
}).finally(() => {
  console.log();
  console.log('=== END DEBUG TEST ===');
});