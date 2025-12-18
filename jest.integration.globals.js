// Global setup file that runs before Jest environment is initialized
const net = require("net");

// Check if port is available
const isPortAvailable = (port) => {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
};

// Global test configuration
global.testConfig = {
  TEST_PORT: 3000,
  APP_URL: process.env.APP_URL || "http://localhost:3000",

  // Dashboard endpoints based on user role
  ORGANISER_DASHBOARD: "/organiser-dashboard",
  MEMBER_DASHBOARD: "/member-dashboard",

  // Test utilities
  isPortAvailable,
};

// Global test utilities
global.testUtils = {
  // Pre-created test user credentials (created by create-test-users.js)
  getTestCredentials: () => ({
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
  }),

  // Wait for element to be visible
  waitForSelector: async (page, selector, timeout = 5000) => {
    try {
      await page.waitForSelector(selector, { visible: true, timeout });
      return true;
    } catch (error) {
      console.error(`Element not found: ${selector}`);
      return false;
    }
  },

  // Fill form field safely
  fillField: async (page, selector, value) => {
    await page.waitForSelector(selector);
    await page.click(selector);
    await page.keyboard.down("Control");
    await page.keyboard.press("KeyA");
    await page.keyboard.up("Control");
    await page.type(selector, value);
  },

  // Take screenshot for debugging
  screenshot: async (page, name) => {
    if (process.env.SAVE_SCREENSHOTS) {
      const fs = require("fs");
      const path = require("path");
      const screenshotDir = path.join(
        __dirname,
        "__tests__",
        "integration",
        "screenshots"
      );

      // Create screenshot directory if it doesn't exist
      if (!fs.existsSync(screenshotDir)) {
        fs.mkdirSync(screenshotDir, { recursive: true });
      }

      await page.screenshot({
        path: path.join(screenshotDir, `${name}.png`),
        fullPage: true,
      });
    }
  },
};

// Make test credentials available globally for tests
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
