// use.cjs
const path = require("path");
const { exec } = require("child_process");
const { promisify } = require("util");

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

  // Install the package locally
  await execAsync(`npm install ${packageName}@${version}`, { stdio: 'ignore' });

  // Dynamically require the package
  const packagePath = path.resolve('node_modules', packageName);
  return require(packagePath);
}

module.exports = { use };