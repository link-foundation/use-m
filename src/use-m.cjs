const resolvers = require('./resolvers.cjs');;

const baseUse = async (modulePath) => {
  // Dynamically import the module
  try {
    const module = await import(modulePath);
    // Check if the only key in the module is "default"
    const keys = Object.keys(module);
    if (keys.length === 1 && keys[0] === 'default') {
      return module.default || module;
    }
    return module;
  } catch (error) {
    throw new Error(`Failed to import module from '${modulePath}'.`, { cause: error });
  }
}

const use = async (moduleSpecifier) => {
  const { npm } = resolvers;
  return baseUse(await npm(moduleSpecifier, require.resolve));
}

module.exports = { use }