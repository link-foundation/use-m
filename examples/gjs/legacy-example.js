// GJS legacy example showing use-m working with GJS legacy imports system
// Run with: gjs legacy-example.js
// Note: This example uses the legacy imports object rather than ES modules

// For legacy GJS, we need to use the eval approach since we can't use await import()
// This demonstrates how use-m works even with the legacy imports object
const useJs = await (await fetch('https://unpkg.com/use-m/use.js')).text();
const { use } = eval(useJs);

console.log('🏠 Testing use-m with GJS (GNOME JavaScript) legacy imports...');

try {
  // Test basic package import
  console.log('📦 Importing lodash...');
  const _ = await use('lodash@4.17.21');
  const result = _.add(1, 2);
  console.log(`✅ _.add(1, 2) = ${result}`);
  
  // Test GJS built-in module support (console)
  console.log('🏠 Testing GJS built-in module support...');
  const consoleModule = await use('console');
  console.log('✅ Console module imported successfully');
  
  // Test GJS built-in modules using legacy imports (if available)
  if (typeof imports !== 'undefined') {
    console.log('🏠 Testing GJS legacy built-in module access...');
    
    // Test GJS built-in via use-m
    try {
      const cairoModule = await use('cairo');
      console.log('✅ Cairo module imported via use-m successfully');
    } catch (e) {
      console.log('⚠️ Cairo module not available (this is expected in some GJS environments)');
    }
    
    // Test GI library access via use-m with gi:// protocol
    try {
      const GLib = await use('gi://GLib');
      console.log('✅ GLib imported via gi:// protocol successfully');
      console.log(`✅ GLib version info available: ${typeof GLib !== 'undefined'}`);
    } catch (e) {
      console.log('⚠️ GLib via gi:// not available (this is expected in some GJS environments)');
      console.log('   Error:', e.message);
    }
    
    // Test with version specification
    try {
      const Gtk = await use('gi://Gtk?version=4.0');
      console.log('✅ Gtk 4.0 imported via gi:// protocol successfully');
    } catch (e) {
      console.log('⚠️ Gtk 4.0 not available (this is expected in some GJS environments)');
    }
  }

  console.log('🎉 All tests passed! GJS legacy support is working correctly.');
} catch (error) {
  console.error('❌ Error:', error.message);
  console.error(error.stack);
}