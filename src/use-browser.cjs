const resolvers = {
  skypack: async (moduleSpecifier, baseResolver) => {
    const resolvedPath = `https://cdn.skypack.dev/${moduleSpecifier}`;
    return resolvedPath;
  },
  jsdelivr: async (moduleSpecifier, baseResolver) => {
    const match = moduleSpecifier.match(/^([^@\/]+)@([^\/]+)(\/.+)?$/);
    if (!match) {
      throw new Error(`Invalid module specifier: ${moduleSpecifier}`);
    }
    let [, packageName, version, subpath = ''] = match;

    // If no subpath is provided, append /{packageName}.js
    const path = subpath ? `${subpath}.js` : `/${packageName}.js`;
    const resolvedPath = `https://cdn.jsdelivr.net/npm/${packageName}-es@${version}${path}`;
    return resolvedPath;
  },
  unpkg: async (moduleSpecifier, baseResolver) => {
    const match = moduleSpecifier.match(/^([^@\/]+)@([^\/]+)(\/.+)?$/);
    if (!match) {
      throw new Error(`Invalid module specifier: ${moduleSpecifier}`);
    }
    let [, packageName, version, subpath = ''] = match;

    // If no subpath is provided, append /{packageName}.js
    const path = subpath ? `${subpath}.js` : `/${packageName}.js`;
    const resolvedPath = `https://unpkg.com/${packageName}-es@${version}${path}`;
    return resolvedPath;
  },
  esm: async (moduleSpecifier, baseResolver) => {
    const resolvedPath = `https://esm.sh/${moduleSpecifier}`;
    return resolvedPath;
  },
  jspm: async (moduleSpecifier, baseResolver) => {
    const match = moduleSpecifier.match(/^([^@\/]+)@([^\/]+)(\/.+)?$/);
    if (!match) {
      throw new Error(`Invalid module specifier: ${moduleSpecifier}`);
    }
    let [, packageName, version, subpath = ''] = match;

    // For jspm, use the package name as is (no '-es')
    const path = subpath;
    const resolvedPath = `https://jspm.dev/${packageName}@${version}${path}`;
    return resolvedPath;
  },
}

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

async (moduleSpecifier) => {
  const { unpkg } = resolvers;
  return baseUse(await unpkg(moduleSpecifier));
}