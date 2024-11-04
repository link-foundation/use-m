#!/usr/bin/env zx

// Install Jest and Babel dependencies
await $`yarn add --dev jest @babel/preset-env babel-jest`;

// Create .babelrc file
await fs.writeFile('.babelrc', JSON.stringify({ presets: ['@babel/preset-env'] }, null, 2) + '\n');

// Create jest.config.js file
await fs.writeFile(
  'jest.config.js',
  `export default {
  transform: {
    "^.+\\\\.cjs$": "babel-jest",
    "^.+\\\\.mjs$": "babel-jest"
  },
  testMatch: ["**/tests/**/*.[mc][jt]s?(x)", "**/?(*.)+(spec|test).[mc][jt]s?(x)"]
};
`);

// Update package.json using jq
if (await fs.pathExists('package.json')) {
  await $`jq '.scripts.test = "jest" | .type = "module"' package.json > temp.json && mv temp.json package.json`;
  console.log("Test script and type module set in package.json.");
} else {
  console.log("package.json not found.");
}

console.log("Setup complete! Jest and Babel have been configured.");