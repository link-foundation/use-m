export default {
  transform: {
    "^.+\\.cjs$": "babel-jest",
    "^.+\\.mjs$": "babel-jest",
  },
  testMatch: [
    "**/tests/*.test.cjs",
    "**/tests/*.test.mjs",
    "**/tests/**/*.test.cjs",
    "**/tests/**/*.test.mjs"
  ],
  testPathIgnorePatterns: [
    '/node_modules/'
  ],
};
