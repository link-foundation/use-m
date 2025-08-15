const parseModuleSpecifier = (moduleSpecifier) => {
  if (!moduleSpecifier || typeof moduleSpecifier !== 'string' || moduleSpecifier.length <= 0) {
    throw new Error(
      `Name for a package to be imported is not provided.
Please specify package name and an optional version (e.g., 'lodash', 'lodash@4.17.21' or '@chakra-ui/react@1.0.0').`
    );
  }
  const regex = /^(?<packageName>(@[^@/]+\/)?[^@/]+)?(?:@(?<version>[^/]*))?(?<modulePath>(?:\/[^@]+)*)?$/;
  const match = moduleSpecifier.match(regex);
  if (!match || typeof match.groups.packageName !== 'string' || match.groups.packageName.trim() === '') {
    throw new Error(
      `Failed to parse package identifier '${moduleSpecifier}'.
Please specify a package name, and an optional version (e.g.: 'lodash', 'lodash@4.17.21' or '@chakra-ui/react@1.0.0').`
    );
  }
  let { packageName, version, modulePath } = match.groups;
  if (typeof version !== 'string' || version.trim() === '') {
    version = 'latest';
  }
  if (typeof modulePath !== 'string' || modulePath.trim() === '') {
    modulePath = '';
  }
  return { packageName, version, modulePath };
}

// Built-in modules that we support across all environments
// Always use lowercase names for consistency
const supportedBuiltins = {
  // Universal modules
  'console': {
    browser: () => ({ default: console, log: console.log, error: console.error, warn: console.warn, info: console.info }),
    node: () => import('node:console').then(m => ({ default: m.Console, ...m }))
  },
  'crypto': {
    browser: () => ({ default: crypto, subtle: crypto.subtle }),
    node: () => import('node:crypto').then(m => ({ default: m, ...m }))
  },
  'url': {
    browser: () => ({ default: URL, URL, URLSearchParams }),
    node: () => import('node:url').then(m => ({ default: m, ...m }))
  },
  'performance': {
    browser: () => ({ default: performance, now: performance.now.bind(performance) }),
    node: () => import('node:perf_hooks').then(m => ({ default: m.performance, performance: m.performance, now: m.performance.now.bind(m.performance), ...m }))
  },
  
  // Node.js/Bun only modules
  'fs': {
    browser: null, // Not available in browser
    node: () => import('node:fs').then(m => ({ default: m, ...m }))
  },
  'path': {
    browser: null, // Not available in browser
    node: () => import('node:path').then(m => ({ default: m, ...m }))
  },
  'os': {
    browser: null, // Not available in browser
    node: () => import('node:os').then(m => ({ default: m, ...m }))
  },
  'util': {
    browser: null, // Not available in browser
    node: () => import('node:util').then(m => ({ default: m, ...m }))
  },
  'events': {
    browser: null, // Not available in browser
    node: () => import('node:events').then(m => ({ default: m.EventEmitter, EventEmitter: m.EventEmitter, ...m }))
  },
  'stream': {
    browser: null, // Not available in browser
    node: () => import('node:stream').then(m => ({ default: m.Stream, Stream: m.Stream, ...m }))
  },
  'buffer': {
    browser: null, // Not available in browser (would need polyfill)
    node: () => import('node:buffer').then(m => ({ default: m, Buffer: m.Buffer, ...m }))
  },
  'process': {
    browser: null, // Not available in browser
    node: () => ({ default: process, ...process })
  },
  'child_process': {
    browser: null,
    node: () => import('node:child_process').then(m => ({ default: m, ...m }))
  },
  'http': {
    browser: null,
    node: () => import('node:http').then(m => ({ default: m, ...m }))
  },
  'https': {
    browser: null,
    node: () => import('node:https').then(m => ({ default: m, ...m }))
  },
  'net': {
    browser: null,
    node: () => import('node:net').then(m => ({ default: m, ...m }))
  },
  'dns': {
    browser: null,
    node: () => import('node:dns').then(m => ({ default: m, ...m }))
  },
  'zlib': {
    browser: null,
    node: () => import('node:zlib').then(m => ({ default: m, ...m }))
  },
  'querystring': {
    browser: null,
    node: () => import('node:querystring').then(m => ({ default: m, ...m }))
  },
  'assert': {
    browser: null,
    node: () => import('node:assert').then(m => ({ default: m.default || m, ...m }))
  }
};

const resolvers = {
  builtin: async (moduleSpecifier, pathResolver) => {
    const { packageName } = parseModuleSpecifier(moduleSpecifier);
    
    // Remove 'node:' prefix if present
    const moduleName = packageName.startsWith('node:') ? packageName.slice(5) : packageName;
    
    // Check if we support this built-in module
    if (supportedBuiltins[moduleName]) {
      // Return special marker indicating this is a built-in module
      return `builtin:${moduleName}`;
    }
    
    // Not a supported built-in module
    return null;
  },
  bun: async (moduleSpecifier, pathResolver) => {
    // temporary fallback
    return resolvers.npm(moduleSpecifier, pathResolver);
  },
  npm: async (moduleSpecifier, pathResolver) => {
    const path = await import('path');
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const { stat, readFile } = await import('fs/promises');
    const execAsync = promisify(exec);

    if (!pathResolver) {
      throw new Error('Failed to get the current resolver.');
    }

    const fileExists = async (filePath) => {
      try {
        const stats = await stat(filePath);
        return stats.isFile();
      } catch (error) {
        if (error.code !== 'ENOENT') {
          throw error;
        }
        return false;
      }
    };

    const directoryExists = async (directoryPath) => {
      try {
        const stats = await stat(directoryPath);
        return stats.isDirectory();
      } catch (error) {
        if (error.code !== 'ENOENT') {
          throw error;
        }
        return false;
      }
    };

    const tryResolveModule = async (packagePath) => {
      try {
        return await pathResolver(packagePath);
      } catch (error) {
        if (error.code !== 'MODULE_NOT_FOUND') {
          throw error;
        }

        // Attempt to resolve paths like 'yargs@18.0.0/helpers' to 'yargs-v-18.0.0/helpers/helpers.mjs'
        if (await directoryExists(packagePath)) {
          const directoryName = path.basename(packagePath);
          const resolvedPath = await tryResolveModule(path.join(packagePath, directoryName));
          if (resolvedPath) {
            return resolvedPath;
          }

          // Attempt to resolve paths like 'octokit/core@latest' to 'octokit-core-v-latest/dist-src/index.js' (as it written in package.json)
          const packageJsonPath = path.join(packagePath, 'package.json');
          if (await fileExists(packageJsonPath)) {
            const packageJson = await readFile(packageJsonPath, 'utf8');
            const { exports } = JSON.parse(packageJson);
            if (exports) {
              const rootPath = exports['.'];
              if (rootPath) {
                const importPath = rootPath['import'];
                if (importPath) {
                  const updatedPath = path.join(packagePath, importPath);
                  return await tryResolveModule(updatedPath);
                }
              }
            }
          }

          return null;
        }

        return null;
      }
    };

    const getLatestVersion = async (packageName) => {
      const { stdout: version } = await execAsync(`npm show ${packageName} version`);
      return version.trim();
    };

    const getInstalledPackageVersion = async (packagePath) => {
      try {
        const packageJsonPath = path.join(packagePath, 'package.json');
        const data = await readFile(packageJsonPath, 'utf8');
        const { version } = JSON.parse(data);
        return version;
      } catch {
        return null;
      }
    };

    const ensurePackageInstalled = async ({ packageName, version }) => {
      const alias = `${packageName.replace('@', '').replace('/', '-')}-v-${version}`;
      const { stdout: globalModulesPath } = await execAsync('npm root -g');
      const packagePath = path.join(globalModulesPath.trim(), alias);
      if (version !== 'latest' && await directoryExists(packagePath)) {
        return packagePath;
      }
      if (version === 'latest') {
        const latestVersion = await getLatestVersion(packageName);
        const installedVersion = await getInstalledPackageVersion(packagePath);
        if (installedVersion === latestVersion) {
          return packagePath;
        }
      }
      try {
        await execAsync(`npm install -g ${alias}@npm:${packageName}@${version}`, { stdio: 'ignore' });
      } catch (error) {
        throw new Error(`Failed to install ${packageName}@${version} globally.`, { cause: error });
      }
      return packagePath;
    };

    const { packageName, version, modulePath } = parseModuleSpecifier(moduleSpecifier);
    const packagePath = await ensurePackageInstalled({ packageName, version });
    const packageModulePath = modulePath ? path.join(packagePath, modulePath) : packagePath;
    const resolvedPath = await tryResolveModule(packageModulePath);
    if (!resolvedPath) {
      throw new Error(`Failed to resolve the path to '${moduleSpecifier}' from '${packageModulePath}'.`);
    }
    return resolvedPath;
  },
  skypack: async (moduleSpecifier, pathResolver) => {
    const resolvedPath = `https://cdn.skypack.dev/${moduleSpecifier}`;
    return resolvedPath;
  },
  jsdelivr: async (moduleSpecifier, pathResolver) => {
    const { packageName, version, modulePath } = parseModuleSpecifier(moduleSpecifier);
    // If no modulePath is provided, append /{packageName}.js
    let path = modulePath ? modulePath : `/${packageName}`;
    if (/\.(mc)?js$/.test(path) === false) {
      path += '.js';
    }
    const resolvedPath = `https://cdn.jsdelivr.net/npm/${packageName}-es@${version}${path}`;
    return resolvedPath;
  },
  unpkg: async (moduleSpecifier, pathResolver) => {
    const { packageName, version, modulePath } = parseModuleSpecifier(moduleSpecifier);
    // If no modulePath is provided, append /{packageName}.js
    let path = modulePath ? modulePath : `/${packageName}`;
    if (/\.(mc)?js$/.test(path) === false) {
      path += '.js';
    }
    const resolvedPath = `https://unpkg.com/${packageName}-es@${version}${path}`;
    return resolvedPath;
  },
  esm: async (moduleSpecifier, pathResolver) => {
    const resolvedPath = `https://esm.sh/${moduleSpecifier}`;
    return resolvedPath;
  },
  jspm: async (moduleSpecifier, pathResolver) => {
    let { packageName, version, modulePath } = parseModuleSpecifier(moduleSpecifier);
    if (version === 'latest') {
      version = '';
    }
    const resolvedPath = `https://jspm.dev/${packageName}${version ? `@${version}` : ''}${modulePath}`;
    return resolvedPath;
  },
}

const baseUse = async (modulePath) => {
  // Handle built-in modules
  if (typeof modulePath === 'string' && modulePath.startsWith('builtin:')) {
    const moduleName = modulePath.slice(8); // Remove 'builtin:' prefix
    const builtinConfig = supportedBuiltins[moduleName];
    
    if (!builtinConfig) {
      throw new Error(`Built-in module '${moduleName}' is not supported.`);
    }
    
    // Determine environment
    const isBrowser = typeof window !== 'undefined';
    const environment = isBrowser ? 'browser' : 'node';
    
    const moduleFactory = builtinConfig[environment];
    if (!moduleFactory) {
      throw new Error(`Built-in module '${moduleName}' is not available in ${environment} environment.`);
    }
    
    try {
      // Execute the factory function to get the module
      const result = await moduleFactory();
      return result;
    } catch (error) {
      throw new Error(`Failed to load built-in module '${moduleName}' in ${environment} environment.`, { cause: error });
    }
  }
  
  // Dynamically import the module
  try {
    const module = await import(modulePath);
    
    // More robust default export handling for cross-environment compatibility
    const keys = Object.keys(module);
    
    // If it's a Module object with a default property, unwrap it
    if (module.default !== undefined) {
      // Check if this is likely a CommonJS module with only default export
      if (keys.length === 1 && keys[0] === 'default') {
        return module.default;
      }
      
      // Check if default is the main export and other keys are just function/module metadata
      const metadataKeys = new Set([
        'default', '__esModule', 'Symbol(Symbol.toStringTag)',
        'length', 'name', 'prototype', 'constructor',
        'toString', 'valueOf', 'hasOwnProperty', 'isPrototypeOf', 'propertyIsEnumerable'
      ]);
      
      const nonMetadataKeys = keys.filter(key => !metadataKeys.has(key));
      
      // If there are no significant non-metadata keys, return the default
      if (nonMetadataKeys.length === 0) {
        return module.default;
      }
      
      // Special case: If the module looks like a Module object (has toString that returns '[object Module]')
      // and default is a function, prefer the default
      if (typeof module.default === 'function' && 
          module.toString && 
          module.toString().includes('[object Module]')) {
        return module.default;
      }
    }
    
    // Return the whole module if it has multiple meaningful exports or no default
    return module;
  } catch (error) {
    throw new Error(`Failed to import module from '${modulePath}'.`, { cause: error });
  }
}

const makeUse = async (options) => {
  let specifierResolver = options?.specifierResolver;
  if (typeof specifierResolver !== 'function') {
    if (typeof window !== 'undefined') {
      specifierResolver = resolvers[specifierResolver || 'esm'];
    } else if (typeof Bun !== 'undefined') {
      specifierResolver = resolvers[specifierResolver || 'bun'];
    } else {
      specifierResolver = resolvers[specifierResolver || 'npm'];
    }
  }
  let scriptPath = options?.scriptPath;
  if (!scriptPath && typeof __filename !== 'undefined') {
    scriptPath = __filename;
  }
  const metaUrl = options?.meta?.url;
  if (!scriptPath && metaUrl) {
    scriptPath = metaUrl;
  }
  let pathResolver = options?.pathResolver;
  if (!pathResolver) {
    if (typeof require !== 'undefined') {
      pathResolver = require.resolve;
    } else if (scriptPath) {
      pathResolver = await import('module')
        .then(module => module.createRequire(scriptPath))
        .then(require => require.resolve);
    } else {
      pathResolver = (path) => path;
    }
  }
  return async (moduleSpecifier) => {
    // Always try built-in resolver first
    const builtinPath = await resolvers.builtin(moduleSpecifier, pathResolver);
    if (builtinPath) {
      return baseUse(builtinPath);
    }
    
    // If not a built-in module, use the configured resolver
    const modulePath = await specifierResolver(moduleSpecifier, pathResolver);
    return baseUse(modulePath);
  };
}

let __use = null;
const use = async (moduleSpecifier) => {
  if (!__use) {
    __use = await makeUse();
  }
  return __use(moduleSpecifier);
}
use.all = async (...moduleSpecifiers) => {
  if (!__use) {
    __use = await makeUse();
  }
  return Promise.all(moduleSpecifiers.map(__use));
}

module.exports = {
  parseModuleSpecifier,
  resolvers,
  makeUse,
  baseUse,
  use,
};