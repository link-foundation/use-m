#!/usr/bin/env node

/**
 * Debug script to trace the resolution logic
 */

import { parseModuleSpecifier } from '../use.mjs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const moduleSpecifier = 'yargs/helpers';
const { packageName, version, modulePath } = parseModuleSpecifier(moduleSpecifier);

console.log('Parsed module specifier:', { packageName, version, modulePath });

// This is what happens in the code:
const packagePath = '/home/hive/.nvm/versions/node/v20.19.5/lib/node_modules/yargs-v-latest';
const packageModulePath = modulePath ? path.join(packagePath, modulePath) : packagePath;

console.log('Package path:', packagePath);
console.log('Package module path:', packageModulePath);

// The problem: we're reading package.json from packageModulePath, but we should read from packagePath
const wrongPackageJsonPath = path.join(packageModulePath, 'package.json');
const correctPackageJsonPath = path.join(packagePath, 'package.json');

console.log('\nWrong package.json path:', wrongPackageJsonPath);
console.log('Correct package.json path:', correctPackageJsonPath);

try {
  const packageJson = await readFile(correctPackageJsonPath, 'utf8');
  const parsed = JSON.parse(packageJson);
  console.log('\nExports field:', JSON.stringify(parsed.exports, null, 2));

  // Check for subPath
  const dottedSubPath = `.${modulePath}`;
  console.log('\nLooking for:', dottedSubPath);
  console.log('Found:', parsed.exports[dottedSubPath]);
} catch (error) {
  console.error('Error:', error.message);
}
