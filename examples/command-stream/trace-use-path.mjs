// Trace the exact path use-m takes when importing command-stream
import { inspect } from 'util';

console.log('=== TRACE USE-M PATH ===');
console.log('Runtime:', typeof Bun !== 'undefined' ? 'Bun' : 'Node.js');
console.log();

async function traceUsePath() {
  // Import use-m components
  const useModule = await import('../../use.mjs');
  const { use, baseUse, resolvers, parseModuleSpecifier } = useModule;
  
  console.log('--- Step 1: Parse module specifier ---');
  const parsed = parseModuleSpecifier('command-stream');
  console.log('Parsed:', parsed);
  console.log();
  
  console.log('--- Step 2: Check which resolver will be used ---');
  const isBrowser = typeof window !== 'undefined';
  const isNode = typeof process !== 'undefined' && process.versions && process.versions.node;
  const isBun = typeof Bun !== 'undefined';
  
  console.log('Environment checks:');
  console.log('  isBrowser:', isBrowser);
  console.log('  isNode:', isNode);
  console.log('  isBun:', isBun);
  
  // Determine which resolver would be selected
  let expectedResolver;
  if (isBrowser) {
    expectedResolver = 'esm';
  } else if (isBun) {
    expectedResolver = 'bun';
  } else {
    expectedResolver = 'npm';
  }
  console.log('Expected resolver:', expectedResolver);
  console.log();
  
  console.log('--- Step 3: Try different resolvers manually ---');
  
  // Try NPM resolver
  if (resolvers.npm) {
    console.log('NPM resolver:');
    try {
      const npmPath = await resolvers.npm('command-stream');
      console.log('  Resolved path:', npmPath);
      
      console.log('  Importing from NPM path...');
      const npmModule = await baseUse(npmPath);
      console.log('  Module type:', typeof npmModule);
      console.log('  Has $:', npmModule.$ !== undefined);
      if (npmModule.$) {
        console.log('  $.name:', npmModule.$.name);
      }
    } catch (error) {
      console.log('  ERROR:', error.message);
    }
    console.log();
  }
  
  // Try Bun resolver
  if (resolvers.bun && isBun) {
    console.log('Bun resolver:');
    try {
      const bunPath = await resolvers.bun('command-stream');
      console.log('  Resolved path:', bunPath);
      
      console.log('  Importing from Bun path...');
      const bunModule = await baseUse(bunPath);
      console.log('  Module type:', typeof bunModule);
      console.log('  Has $:', bunModule.$ !== undefined);
      if (bunModule.$) {
        console.log('  $.name:', bunModule.$.name);
      }
    } catch (error) {
      console.log('  ERROR:', error.message);
    }
    console.log();
  }
  
  console.log('--- Step 4: Test baseUse directly with local path ---');
  try {
    const directPath = 'command-stream';
    console.log('Direct import of:', directPath);
    const directModule = await baseUse(directPath);
    console.log('  Module type:', typeof directModule);
    console.log('  Module keys:', Object.keys(directModule).slice(0, 5), '...');
    console.log('  Has $:', directModule.$ !== undefined);
  } catch (error) {
    console.log('  ERROR:', error.message);
  }
  console.log();
  
  console.log('--- Step 5: Use the actual use() function ---');
  try {
    const moduleFromUse = await use('command-stream');
    console.log('Module from use():');
    console.log('  Type:', typeof moduleFromUse);
    console.log('  Keys:', Object.keys(moduleFromUse).slice(0, 5), '...');
    console.log('  Has $:', moduleFromUse.$ !== undefined);
    
    // Try destructuring
    const { $ } = moduleFromUse;
    console.log('  Destructured $:', $);
  } catch (error) {
    console.log('  ERROR:', error.message);
  }
}

traceUsePath().catch(err => {
  console.error('FATAL ERROR:', err);
}).finally(() => {
  console.log();
  console.log('=== END TRACE ===');
});