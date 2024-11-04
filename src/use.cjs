async (packageIdentifier) => {
  const path = require("path");
  const { exec } = require("child_process");
  const { promisify } = require("util");
  const execAsync = promisify(exec);

  if (!packageIdentifier || typeof packageIdentifier !== 'string' || packageIdentifier.length <= 0) {
    throw new Error(`Name for a package to be installed and imported is not provided. Please specify package name and a version (e.g., 'lodash@4.17.21' or '@chakra-ui/react@1.0.0').`);
  }

  let packageName, version;

  // Extract package name and version
  const dividerPosition = packageIdentifier.lastIndexOf('@');
  if (dividerPosition > 0) {
    packageName = packageIdentifier.slice(0, dividerPosition);
    version = packageIdentifier.slice(dividerPosition + 1);
  } else {
    throw new Error(`Failed to install and import package with '${packageIdentifier}' identifier. Please specify a version (e.g., 'lodash@4.17.21' or '@chakra-ui/react@1.0.0').`);
  }

  // Define the alias for global installation
  const alias = `${packageName.replace('@', '').replace('/', '-')}-v${version}`;

  // Install the package globally with the specified version and alias
  try {
    await execAsync(`npm install -g ${alias}@npm:${packageName}@${version}`, { stdio: 'ignore' });
  } catch (error) {
    throw new Error(`Failed to install ${packageName}@${version} globally.`, { cause: error });
  }

  // Get the global node_modules path
  const { stdout } = await execAsync("npm root -g");
  const globalPath = stdout.trim();

  // Resolve the exact path to the installed package with alias
  const packagePath = path.join(globalPath, alias);
  const resolvedPath = require.resolve(packagePath);

  // Dynamically require the package
  try {
    const module = require(resolvedPath);

    // Check if the only key in the module is "default"
    const keys = Object.keys(module);
    if (keys.length === 1 && keys[0] === 'default') {
      return module.default || module;
    }

    return module;
  } catch (error) {
    throw new Error(`Failed to require ${packageName}@${version} from '${packagePath}' resolved as '${resolvedPath}'.`, { cause: error });
  }
}