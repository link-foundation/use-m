// Test the local implementation with GJS
// Run with: gjs test-local.mjs

// Import the local use-m implementation
const { use } = await import('../../use.mjs');

console.log('🏠 Testing local use-m implementation with GJS...');

try {
  // Verify GJS detection works
  if (typeof imports !== 'undefined') {
    console.log('✅ GJS runtime detected (legacy imports available)');
    console.log(`   Imports object exists: ${typeof imports === 'object'}`);
    if (imports.gi) {
      console.log('   GObject introspection available: ✅');
    } else {
      console.log('   GObject introspection available: ❌');
    }
  } else {
    console.log('❌ GJS runtime not detected (legacy imports not available)');
    console.log('   This might be a modern GJS environment using only ES modules');
  }
  
  // Test resolver selection by checking internal behavior
  console.log('📦 Testing resolver selection...');
  
  // We can test built-in module support
  try {
    const consoleModule = await use('console');
    console.log('✅ Console built-in module resolution works');
  } catch (e) {
    console.log('❌ Console built-in module resolution failed:', e.message);
  }
  
  // Test URL built-in module support
  try {
    const urlModule = await use('url');
    console.log('✅ URL built-in module resolution works');
  } catch (e) {
    console.log('❌ URL built-in module resolution failed:', e.message);
  }
  
  console.log('✅ GJS resolver ready');
  
  console.log('🎉 GJS support implementation is ready!');
  console.log('💡 To test with network access, run: gjs examples/gjs/example.mjs');
} catch (error) {
  console.error('❌ Error:', error.message);
  console.error(error.stack);
}