const path = require('path');
const fs = require('fs');
const resolvers = require('./resolvers.cjs');
const code = fs.readFileSync(path.join(__dirname, 'use.cjs'), 'utf8');
const baseUse = eval(code);
const use = async (moduleSpecifier) => {
  const { npm } = resolvers;
  return baseUse(await npm(moduleSpecifier, require.resolve));
}
module.exports = { use }