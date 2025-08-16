// Test for command-stream module import bug (Issue #31)
// Run with: node test-command-stream.mjs

console.log('=== COMMAND-STREAM IMPORT TEST ===');
console.log('Testing: https://github.com/link-foundation/use-m/issues/31');
console.log();

async function testCommandStream() {
  console.log('--- Test 1: Import via use-m MJS ---');
  try {
    const { use } = await import('../../use.mjs');
    const { $ } = await use('command-stream');
    
    console.log('$:', { $ });
    
    if ($ === undefined) {
      console.log('❌ FAIL: $ is undefined');
    } else if (typeof $ !== 'function') {
      console.log('❌ FAIL: $ is not a function, got:', typeof $);
    } else {
      console.log('✅ SUCCESS: $ is properly imported as a function');
    }
  } catch (error) {
    console.log('❌ ERROR:', error.message);
  }
  console.log();

  console.log('--- Test 2: Import via use-m CJS ---');
  try {
    const { use } = await import('../../use.cjs');
    const { $ } = await use('command-stream');
    
    console.log('$:', { $ });
    
    if ($ === undefined) {
      console.log('❌ FAIL: $ is undefined');
    } else if (typeof $ !== 'function') {
      console.log('❌ FAIL: $ is not a function, got:', typeof $);
    } else {
      console.log('✅ SUCCESS: $ is properly imported as a function');
    }
  } catch (error) {
    console.log('❌ ERROR:', error.message);
  }
  console.log();

  console.log('--- Test 3: Import via default export ---');
  try {
    const { use } = await import('use-m');
    const { $ } = await use('command-stream');
    
    console.log('$:', { $ });
    
    if ($ === undefined) {
      console.log('❌ FAIL: $ is undefined');
    } else if (typeof $ !== 'function') {
      console.log('❌ FAIL: $ is not a function, got:', typeof $);
    } else {
      console.log('✅ SUCCESS: $ is properly imported as a function');
    }
  } catch (error) {
    console.log('❌ ERROR:', error.message);
  }
  console.log();
}

testCommandStream().then(() => {
  console.log('=== END COMMAND-STREAM TEST ===');
});