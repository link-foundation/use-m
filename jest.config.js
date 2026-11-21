export default {
  testMatch: [
    "**/tests/*.test.cjs",
    "**/tests/*.test.mjs",
    "**/tests/**/*.test.cjs",
    "**/tests/**/*.test.mjs"
  ],
  testPathIgnorePatterns: [
    '/node_modules/'
  ],
  // Several tests install real packages from the npm registry. Jest's 5 s
  // default turned slow-but-healthy installs on Windows into failures
  // (issue #76), so Jest gets the same budget as Bun (bunfig.toml).
  testTimeout: 30000,
};
