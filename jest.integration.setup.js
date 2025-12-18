// Integration test setup - runs after Jest environment is loaded
const { spawn } = require("child_process");
const net = require("net");
const puppeteer = require("puppeteer");

// Import global configuration
require("./jest.integration.globals");

// Initialize test credentials globally
global.testCredentials = {
  organizer: {
    email: "test-organizer@example.com",
    password: "TestPassword123!",
    firstName: "Test",
    lastName: "Organizer",
    role: "Organiser",
  },
  member: {
    email: "test-member@example.com",
    password: "TestPassword123!",
    firstName: "Test",
    lastName: "Member",
    role: "Team Member",
  },
};

const TEST_PORT = global.testConfig.TEST_PORT;
let serverProcess;
let browser;

// Wait for server to be accessible
const waitForServer = (port, timeout = 30000) => {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const checkConnection = () => {
      const socket = new net.Socket();
      socket.setTimeout(1000);

      socket.on("connect", () => {
        socket.destroy();
        resolve();
      });

      socket.on("error", () => {
        socket.destroy();
        if (Date.now() - start > timeout) {
          reject(new Error("Server connection timeout"));
        } else {
          setTimeout(checkConnection, 1000);
        }
      });

      socket.connect(port, "localhost");
    };
    checkConnection();
  });
};

beforeAll(async () => {
  console.log("🚀 Setting up integration test environment...");

  // Check if test port is available
  const portAvailable = await global.testConfig.isPortAvailable(TEST_PORT);
  if (!portAvailable) {
    console.log(`⚠️  Port ${TEST_PORT} is busy, killing existing process...`);
    try {
      require("child_process").execSync(
        `lsof -ti:${TEST_PORT} | xargs kill -9`
      );
      await new Promise((resolve) => setTimeout(resolve, 2000));
    } catch (e) {
      // Port might already be free
    }
  }

  // Start the server for integration tests
  console.log(`🚀 Starting CollabSpace server on port ${TEST_PORT}...`);

  serverProcess = spawn("node", ["src/app.js"], {
    env: {
      ...process.env,
      NODE_ENV: "development", // Use development to start server, but with test database
      PORT: TEST_PORT.toString(),
      MONGODB_URI: process.env.MONGODB_URI || process.env.TEST_MONGODB_URI, // Use test database if available
      // Disable Redis for integration tests to avoid connection issues
      REDIS_HOST: "",
      REDIS_PORT: "",
      REDIS_PASSWORD: "",
      REDIS_URL: "",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  serverProcess.stdout.on("data", (data) => {
    const output = data.toString();
    console.log("Server:", output.trim());
  });

  serverProcess.stderr.on("data", (data) => {
    console.error("Server Error:", data.toString().trim());
  });

  // Wait for server to be ready
  try {
    await waitForServer(TEST_PORT);
    console.log("✅ Server ready for integration tests");
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    throw error;
  }

  // Launch browser
  console.log("🌐 Launching browser...");
  browser = await puppeteer.launch({
    headless: process.env.HEADLESS !== "false",
    slowMo: parseInt(process.env.SLOWMO) || 0,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
    devtools: process.env.HEADLESS === "false",
  });

  // Make browser globally available
  global.browser = browser;

  // Configure test timeout
  jest.setTimeout(60000);
}, 60000);

afterAll(async () => {
  // Clean up browser
  if (browser) {
    console.log("🌐 Closing browser...");
    await browser.close();
    browser = null;
  }

  // Clean up server process
  if (serverProcess && !serverProcess.killed) {
    console.log("🛑 Stopping test server...");

    // Kill the process and all its children
    try {
      process.kill(-serverProcess.pid, "SIGTERM");
    } catch (e) {
      serverProcess.kill("SIGTERM");
    }

    // Wait for graceful shutdown
    await new Promise((resolve) => {
      const timeout = setTimeout(() => {
        try {
          process.kill(-serverProcess.pid, "SIGKILL");
        } catch (e) {
          serverProcess.kill("SIGKILL");
        }
        resolve();
      }, 3000);

      serverProcess.on("exit", () => {
        clearTimeout(timeout);
        resolve();
      });
    });

    serverProcess = null;
  }

  // Force cleanup any remaining handles
  await new Promise((resolve) => setTimeout(resolve, 100));
}, 10000);
