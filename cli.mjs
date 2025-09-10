#!/usr/bin/env node

import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { use } from 'use-m';
import { readFileSync } from 'fs';

// Import yargs and helpers dynamically using `use`
const yargs = await use('yargs@17.7.2');
const { hideBin } = await use('yargs@17.7.2/helpers');

const currentScriptDir = dirname(fileURLToPath(import.meta.url));

// Function to get the loader path
function getLoaderPath() {
  // Get the directory of the current file (cli.mjs)
  try {
    return resolve(currentScriptDir, 'loader.js');
  } catch (err) {
    throw new Error('Failed to get the loader path.', { cause: err });
  }
}

// Function to get the version from package.json
function getVersion() {
  try {
    const packageJsonPath = resolve(currentScriptDir, 'package.json');
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
    return packageJson.version;
  } catch (err) {
    throw new Error('Failed to read package.json or determine the version.', { cause: err });
  }
}

yargs(hideBin(process.argv))
  .scriptName('use-m')
  .usage('$0 [options]')
  .option('loader-path', {
    alias: 'lp',
    type: 'boolean',
    description: 'Output the path to loader.js file',
  })
  .command('cleanup', 'Remove all globally installed packages by use-m', () => {}, async (argv) => {
    try {
      console.log('Starting cleanup of use-m packages...');
      const result = await use.cleanup();
      
      if (result.skipped) {
        console.log(result.skipped);
        return;
      }
      
      console.log(`Environment: ${result.environment}`);
      
      if (result.cleaned.length > 0) {
        console.log(`Successfully removed ${result.cleaned.length} package(s):`);
        result.cleaned.forEach(pkg => console.log(`  - ${pkg}`));
      } else {
        console.log('No use-m packages found to clean up.');
      }
      
      if (result.errors && result.errors.length > 0) {
        console.log('\nErrors encountered:');
        result.errors.forEach(error => {
          if (error.package) {
            console.log(`  - ${error.package}: ${error.error}`);
          } else {
            console.log(`  - ${error.error}`);
          }
        });
      }
    } catch (error) {
      console.error('Failed to cleanup packages:', error.message);
      process.exit(1);
    }
  })
  .help('help')
  .alias('help', 'h')
  .version(getVersion()) // Use yargs' built-in version functionality
  .alias('version', 'v')
  .command('$0', 'Default command', () => { }, (argv) => {
    if (argv.loaderPath) {
      console.log(getLoaderPath());
    } else {
      yargs.showHelp();
    }
  })
  .parse();
