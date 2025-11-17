module.exports = {
  testEnvironment: "node",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  testMatch: ["**/__tests__/**/*.test.js"],
  collectCoverageFrom: [
    "src/**/*.js",
    "!src/public/**",
    "!src/views/**",
    "!src/config/database.js",
  ],
  coveragePathIgnorePatterns: ["/node_modules/", "/dist/"],
  modulePathIgnorePatterns: ["<rootDir>/dist/"],
  clearMocks: true,
  verbose: true,
};

