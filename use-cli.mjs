#!/usr/bin/env node

import { resolve } from 'path';
import { execSync } from 'child_process';
import { use } from 'use-m';

// import yargs from 'yargs';
// import { hideBin } from 'yargs/helpers';
import { readFileSync } from 'fs';

const yargs = await use('yargs@17.7.2');
const { hideBin } = await use('yargs@17.7.2/helpers');

// Function to get the global installation path of a package
function getGlobalInstallPath(packageName) {
  try {
    const path = execSync(`npm root -g`, { encoding: 'utf8' }).trim();
    return resolve(path, packageName);
  } catch (err) {
    console.error(`Failed to determine global path for ${packageName}`);
    process.exit(1);
  }
}

// Get the version from package.json
function getVersion() {
  try {
    const packageJsonPath = resolve(process.cwd(), 'package.json');
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
    return packageJson.version;
  } catch (err) {
    console.error('Failed to read package.json or determine the version.');
    process.exit(1);
  }
}

// Main script logic
function main() {
  yargs(hideBin(process.argv))
    .scriptName('use-m')
    .usage('$0 [options]')
    .option('loader-path', {
      alias: 'l',
      type: 'boolean',
      description: 'Output the path to loader.js file',
    })
    .help('help')
    .alias('help', 'h')
    .version(getVersion()) // Use yargs' built-in version functionality
    .alias('version', 'v')
    .command('$0', 'Default command', () => {}, (argv) => {
      if (argv.loaderPath) {
        const loaderPath = resolve(getGlobalInstallPath('use-m'), 'loader.js');
        console.log(loaderPath);
      } else {
        yargs.showHelp();
      }
    })
    .parse();
}

// Execute the script
main();