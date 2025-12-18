module.exports = {
  testMatch: ["**/__tests__/integration/**/*.test.js"],
  testTimeout: 60000,
  setupFiles: ["<rootDir>/jest.integration.globals.js"],
  setupFilesAfterEnv: ["<rootDir>/jest.integration.setup.js"],
  testEnvironment: "node",
  collectCoverageFrom: ["src/**/*.js", "!src/public/**", "!**/__tests__/**"],
  modulePathIgnorePatterns: ["<rootDir>/dist/"],
  globals: {
    APP_URL: process.env.APP_URL || "http://localhost:3000",
  },
};
