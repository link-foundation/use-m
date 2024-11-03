// use.cjs
const path = require("path");
const { exec } = require("child_process");
const { promisify } = require("util");
const { createRequire } = require("module");

const execAsync = promisify(exec);

async function use(packageIdentifier) {
  let packageName, version;

  // Extract package name and version
  const atIndex = packageIdentifier.lastIndexOf('@');
  if (atIndex > 0) {
    packageName = packageIdentifier.slice(0, atIndex);
    version = packageIdentifier.slice(atIndex + 1);
  } else {
    throw new Error("Please provide a version (e.g., 'lodash@4.17.21' or '@scope/package@1.0.0').");
  }

  // Define the alias for global installation
  const alias = `${packageName.replace('/', '-')}-v${version}`;

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

  // Dynamically require the package
  const require = createRequire(__filename);
  try {
    const module = require(require.resolve(packagePath));

    // Check if the only key in the module is "default"
    const keys = Object.keys(module);
    if (keys.length === 1 && keys[0] === 'default') {
      return module.default || module;
    }

    return module;
  } catch (error) {
    throw new Error(`Failed to require ${packageName}@${version} from the global path.`, { cause: error });
  }
}

module.exports = { default: use };