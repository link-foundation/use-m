// Reproduces the cryptic SyntaxError described in issue #58.
// When a CDN returns a plain-text error body instead of the module source,
// eval() parses it as JavaScript and throws an unhelpful error.

console.log('Simulating: eval("Internal Server Error")');
try {
  // This is what the naive bootstrap does with a CDN error body:
  //   const { use } = eval(await (await fetch(...)).text());
  eval('Internal Server Error');
} catch (error) {
  console.log(`  -> ${error.constructor.name}: ${error.message}`);
  console.log('  (No hint that this is a transient CDN/network failure.)');
}
