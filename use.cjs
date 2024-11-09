const parseModuleSpecifier = (moduleSpecifier) => {
  if (!moduleSpecifier || typeof moduleSpecifier !== 'string' || moduleSpecifier.length <= 0) {
    throw new Error(
      `Name for a package to be imported is not provided.
Please specify package name and an optional version (e.g., 'lodash', 'lodash@4.17.21' or '@chakra-ui/react@1.0.0').`
    );
  }
  const regex = /^(?<packageName>@?([^@/]+\/)?[^@/]+)?(?:@(?<version>[^/]*))?(?<modulePath>(?:\/[^@]+)*)?$/;
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

const resolvers = {
  npm: async (moduleSpecifier, pathResolver) => {
    const path = await import('path');
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const { stat, readFile } = await import('fs/promises');
    const execAsync = promisify(exec);

    if (!pathResolver) {
      throw new Error('Failed to get the current resolver.');
    }

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
  // Dynamically import the module
  try {
    const module = await import(modulePath);
    // Check if the only key in the module is 'default'
    const keys = Object.keys(module);
    if (keys.length === 1 && keys[0] === 'default') {
      return module.default || module;
    }
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
    const modulePath = await specifierResolver(moduleSpecifier, pathResolver);
    return baseUse(modulePath);
  };
}

let _use = null;
const use = async (moduleSpecifier) => {
  if (!_use) {
    _use = await makeUse();
  }
  return _use(moduleSpecifier);
};

module.exports = {
  parseModuleSpecifier,
  resolvers,
  makeUse,
  baseUse,
  use,
};