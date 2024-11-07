import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import resolvers from './resolvers.mjs';
const __filename = fileURLToPath(import.meta.url);
const require = createRequire(__filename);

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
export { use };