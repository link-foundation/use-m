// GJS example showing use-m working with GJS (GNOME JavaScript) runtime
// Run with: gjs example.mjs

// Import use-m from CDN (works in GJS with ES modules)
const { use } = await import('https://esm.sh/use-m');

console.log('🏠 Testing use-m with GJS (GNOME JavaScript)...');

try {
  // Test basic package import
  console.log('📦 Importing lodash...');
  const _ = await use('lodash@4.17.21');
  const result = _.add(1, 2);
  console.log(`✅ _.add(1, 2) = ${result}`);
  
  // Test scoped package
  console.log('📦 Importing @octokit/core...');
  const { Octokit } = await use('@octokit/core@6.1.5');
  const octokit = new Octokit();
  console.log('✅ Octokit instance created successfully');
  
  // Test use.all for multiple packages
  console.log('📦 Importing multiple packages...');
  const [lodash3, lodash4] = await use.all('lodash@3', 'lodash@4');
  console.log(`✅ Multiple versions: lodash3.add(1,2)=${lodash3.add(1,2)}, lodash4.add(1,2)=${lodash4.add(1,2)}`);
  
  // Test GJS built-in module support (console)
  console.log('🏠 Testing GJS built-in module support...');
  const consoleModule = await use('console');
  console.log('✅ Console module imported successfully');
  
  // Test URL support (available in GJS)
  console.log('🔗 Testing URL module...');
  const urlModule = await use('url');
  const testUrl = new urlModule.URL('https://github.com/link-foundation/use-m');
  console.log(`✅ URL parsed: ${testUrl.hostname}`);

  console.log('🎉 All tests passed! GJS support is working correctly.');
} catch (error) {
  console.error('❌ Error:', error.message);
  console.error(error.stack);
  // In GJS, we would use imports.system.exit but it's not always available
  // So we just let the script end naturally
}