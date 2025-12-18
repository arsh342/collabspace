#!/usr/bin/env node

/**
 * CollabSpace Integration Test Runner
 * Tests the full authentication and dashboard flow
 */

const { exec } = require("child_process");
const path = require("path");

console.log("🚀 CollabSpace Integration Test Suite\n");

console.log("🚀 CollabSpace Integration Test Runner");
console.log("=====================================\n");

// Check if required dependencies are installed
try {
  require("puppeteer");
  require("jest-puppeteer");
  console.log("✅ Dependencies check passed\n");
} catch (error) {
  console.error(
    "❌ Missing dependencies. Run: npm install puppeteer jest-puppeteer"
  );
  process.exit(1);
}

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  headless: !args.includes("--headful"),
  slowmo: args.includes("--slow") ? 250 : 0,
  debug: args.includes("--debug"),
  screenshots: args.includes("--screenshots"),
  testPattern:
    args.find((arg) => arg.startsWith("--test="))?.replace("--test=", "") ||
    null,
};

if (options.debug) {
  options.headless = false;
  options.slowmo = 500;
  options.screenshots = true;
}

console.log("🔧 Test Configuration:");
console.log(`   Headless: ${options.headless}`);
console.log(`   Slow Motion: ${options.slowmo}ms`);
console.log(`   Screenshots: ${options.screenshots}`);
console.log(`   Test Pattern: ${options.testPattern || "all tests"}`);
console.log("");

// Set environment variables
const env = {
  ...process.env,
  NODE_ENV: "test",
  HEADLESS: options.headless.toString(),
  SLOWMO: options.slowmo.toString(),
  SAVE_SCREENSHOTS: options.screenshots.toString(),
};

// Build Jest command
let jestCommand = [
  "jest",
  "--config=jest.integration.config.js",
  "--runInBand",
  "--verbose",
];

if (options.testPattern) {
  jestCommand.push("--testNamePattern", options.testPattern);
}

console.log("🧪 Starting Integration Tests...\n");

// Run the tests
const testProcess = spawn("npx", jestCommand, {
  env,
  stdio: "inherit",
  cwd: process.cwd(),
});

testProcess.on("close", (code) => {
  console.log("\n📊 Integration Test Results:");
  console.log("============================");

  if (code === 0) {
    console.log("✅ All integration tests passed!");
    console.log(
      "\n🎉 Your CollabSpace application is working correctly in the browser!"
    );

    if (options.screenshots) {
      console.log(
        "\n📸 Screenshots saved to: __tests__/integration/screenshots/"
      );
    }
  } else {
    console.log("❌ Some integration tests failed");
    console.log("\n🔍 Tips for debugging:");
    console.log("   - Run with --debug flag for visual debugging");
    console.log(
      "   - Check __tests__/integration/screenshots/ for visual evidence"
    );
    console.log("   - Ensure your server is running on the correct port");
    console.log("   - Verify database connections are working");
  }

  process.exit(code);
});

testProcess.on("error", (error) => {
  console.error("❌ Error running tests:", error);
  process.exit(1);
});

// Handle process termination
process.on("SIGINT", () => {
  console.log("\n🛑 Tests interrupted by user");
  testProcess.kill("SIGTERM");
  process.exit(1);
});

process.on("SIGTERM", () => {
  console.log("\n🛑 Tests terminated");
  testProcess.kill("SIGTERM");
  process.exit(1);
});
