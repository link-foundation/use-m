

const resolvers = {
  npm: async (moduleSpecifier, baseResolver) => {
  const path = await import('path');
  const { exec } = await import('child_process');
  const { promisify } = await import('util');
  const execAsync = promisify(exec);

  let currentResolver = baseResolver;
  if (!currentResolver) {
    const { createRequire } = await import('module');
    const require = createRequire(__filename);
    currentResolver = require.resolve;
  }
  if (!currentResolver) {
    throw new Error('Failed to get the current resolver.');
  }

  const directoryExists = async (directoryPath) => {
    try {
      const { stat } = await import('fs/promises');
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
    if (!await directoryExists(packagePath)) {
      return null;
    }
    try {
      return currentResolver(packagePath);
    } catch (error) {
      if (error.code !== 'MODULE_NOT_FOUND') {
        throw error;
      }
      return null;
    }
  };

  function parseModuleSpecifier(moduleSpecifier) {
    const regex = /^(?<packageName>@?([^@/]+\/)?[^@/]+)?(?:@(?<version>[^/]+))?(?<modulePath>(?:\/[^@]+)*)?$/;
    const match = moduleSpecifier.match(regex);
    if (!match || !match.groups.packageName) {
      throw new Error(
        `Failed to parse package identifier '${moduleSpecifier}'. Please specify a version (e.g., 'lodash@4.17.21' or '@chakra-ui/react@1.0.0').`
      );
    }
    const { packageName, version = 'latest', modulePath = '' } = match.groups;
    return { packageName, version, modulePath };
  }

  if (!moduleSpecifier || typeof moduleSpecifier !== 'string' || moduleSpecifier.length <= 0) {
    throw new Error(`Name for a package to be installed and imported is not provided. Please specify package name and a version (e.g., 'lodash@4.17.21' or '@chakra-ui/react@1.0.0').`);
  }

  const { packageName, version, modulePath } = parseModuleSpecifier(moduleSpecifier);

  // Define the alias for global installation
  const alias = `${packageName.replace('@', '').replace('/', '-')}-v${version}`;

  // Get the global node_modules path
  const { stdout } = await execAsync("npm root -g");
  const globalPath = stdout.trim();

  // Resolve the exact path to the installed package with alias
  const packagePath = path.join(globalPath, alias);

  const packageModulePath = modulePath ? path.join(packagePath, modulePath) : packagePath;
  let resolvedPath = await tryResolveModule(packageModulePath);

  if (version === 'latest' || !resolvedPath) {
    // Install the package globally with the specified version and alias if not installed or it is the latest version
    try {
      await execAsync(`npm install -g ${alias}@npm:${packageName}@${version}`, { stdio: 'ignore' });
      console.log(`${packageName}@${version} installed successfully.`);
    } catch (error) {
      throw new Error(`Failed to install ${packageName}@${version} globally.`, { cause: error });
    }
  }

  resolvedPath = await tryResolveModule(packageModulePath); // Resolve the path after installation
  if (!resolvedPath) {
    throw new Error(`Failed to resolve the path to ${packageName}@${version} from '${packageModulePath}'.`);
  }

  return resolvedPath;
  }
}

module.exports = resolvers;