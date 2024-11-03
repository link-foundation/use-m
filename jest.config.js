export default {
  testEnvironment: "node",
  transform: {
    "^.+\\.mjs$": "babel-jest",
  },
  testMatch: ["**/tests/**/*.[jt]s?(x)", "**/?(*.)+(spec|test).[tj]s?(x)", "**/tests/**/*.mjs"],
};
