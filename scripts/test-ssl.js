#!/usr/bin/env node

/**
 * SSL Testing Utility for CollabSpace
 * Simple commands to test HTTP and HTTPS modes
 */

const { spawn } = require("child_process");
const https = require("https");
const http = require("http");
const path = require("path");
const fs = require("fs");

class SSLTester {
  constructor() {
    this.httpPort = process.env.HTTP_PORT || 3000;
    this.httpsPort = process.env.HTTPS_PORT || 3443;
    this.sslDir = path.join(__dirname, "../ssl");
  }

  /**
   * Display usage information
   */
  showHelp() {
    console.log("🔐 CollabSpace SSL Testing Utility");
    console.log("===================================");
    console.log("");
    console.log("Usage: node scripts/test-ssl.js [command]");
    console.log("");
    console.log("Commands:");
    console.log("  http           Test HTTP mode (port 3000)");
    console.log("  https          Test HTTPS mode (port 3443)");
    console.log("  both           Test both HTTP and HTTPS");
    console.log("  check          Check SSL certificate status");
    console.log("  urls           Show access URLs");
    console.log("  setup          Setup SSL certificates if missing");
    console.log("  help           Show this help message");
    console.log("");
    console.log("Quick Start:");
    console.log("  npm run test:http     # Test HTTP mode");
    console.log("  npm run test:https    # Test HTTPS mode");
    console.log("  npm run quick:http    # Quick HTTP start");
    console.log("  npm run quick:https   # Quick HTTPS start");
    console.log("");
    console.log("Examples:");
    console.log("  node scripts/test-ssl.js http");
    console.log("  node scripts/test-ssl.js https");
    console.log("  node scripts/test-ssl.js check");
  }

  /**
   * Check if server is running on a specific port
   */
  async checkServer(port, protocol = "http") {
    return new Promise((resolve) => {
      const module = protocol === "https" ? https : http;
      const options =
        protocol === "https"
          ? {
              hostname: "localhost",
              port: port,
              path: "/",
              method: "GET",
              rejectUnauthorized: false, // Accept self-signed certificates
            }
          : {
              hostname: "localhost",
              port: port,
              path: "/",
              method: "GET",
            };

      const req = module.request(options, (res) => {
        resolve({
          running: true,
          status: res.statusCode,
          protocol: protocol,
          port: port,
        });
      });

      req.on("error", () => {
        resolve({
          running: false,
          protocol: protocol,
          port: port,
        });
      });

      req.setTimeout(2000, () => {
        req.destroy();
        resolve({
          running: false,
          protocol: protocol,
          port: port,
          error: "timeout",
        });
      });

      req.end();
    });
  }

  /**
   * Check SSL certificate status
   */
  checkSSLStatus() {
    const certPath = path.join(this.sslDir, "cert.pem");
    const keyPath = path.join(this.sslDir, "key.pem");

    console.log("🔍 SSL Certificate Status");
    console.log("========================");

    const certExists = fs.existsSync(certPath);
    const keyExists = fs.existsSync(keyPath);

    console.log(`📄 Certificate: ${certExists ? "✅" : "❌"} ${certPath}`);
    console.log(`🔑 Private Key: ${keyExists ? "✅" : "❌"} ${keyPath}`);

    if (certExists && keyExists) {
      console.log("✅ SSL certificates are ready for HTTPS mode");
      return true;
    } else {
      console.log("❌ SSL certificates missing");
      console.log("");
      console.log("💡 Generate certificates:");
      console.log("   npm run ssl:generate");
      console.log("   node scripts/test-ssl.js setup");
      return false;
    }
  }

  /**
   * Setup SSL certificates
   */
  async setupSSL() {
    console.log("🔧 Setting up SSL certificates...");

    return new Promise((resolve, reject) => {
      const sslManager = spawn("npm", ["run", "ssl:generate"], {
        stdio: "inherit",
        cwd: path.join(__dirname, ".."),
      });

      sslManager.on("close", (code) => {
        if (code === 0) {
          console.log("✅ SSL certificates setup complete");
          resolve(true);
        } else {
          console.log("❌ SSL setup failed");
          reject(false);
        }
      });

      sslManager.on("error", (error) => {
        console.error("❌ Error setting up SSL:", error.message);
        reject(false);
      });
    });
  }

  /**
   * Show access URLs
   */
  showURLs() {
    console.log("🌐 CollabSpace Access URLs");
    console.log("==========================");
    console.log("");
    console.log(`🔓 HTTP Mode:  http://localhost:${this.httpPort}`);
    console.log(`🔒 HTTPS Mode: https://localhost:${this.httpsPort}`);
    console.log("");
    console.log("📝 Notes:");
    console.log("  • HTTP: Regular unencrypted connection");
    console.log(
      "  • HTTPS: Secure encrypted connection (may show browser warning)"
    );
    console.log(
      '  • For HTTPS: Click "Advanced" → "Proceed to localhost (unsafe)"'
    );
  }

  /**
   * Test HTTP mode
   */
  async testHTTP() {
    console.log("🔓 Testing HTTP Mode");
    console.log("===================");
    console.log("");

    console.log("📡 Checking if HTTP server is running...");
    const httpResult = await this.checkServer(this.httpPort, "http");

    if (httpResult.running) {
      console.log(`✅ HTTP server is running on port ${this.httpPort}`);
      console.log(`🌐 Access: http://localhost:${this.httpPort}`);
      console.log(`📊 Status: ${httpResult.status}`);
      return true;
    } else {
      console.log(`❌ HTTP server not running on port ${this.httpPort}`);
      console.log("");
      console.log("🚀 To start HTTP server:");
      console.log("   npm run dev");
      console.log("   npm run quick:http");
      return false;
    }
  }

  /**
   * Test HTTPS mode
   */
  async testHTTPS() {
    console.log("🔒 Testing HTTPS Mode");
    console.log("====================");
    console.log("");

    // First check if SSL certificates exist
    console.log("🔍 Checking SSL certificates...");
    if (!this.checkSSLStatus()) {
      console.log("");
      console.log("🔧 SSL certificates missing. Run setup first:");
      console.log("   node scripts/test-ssl.js setup");
      return false;
    }

    console.log("");
    console.log("📡 Checking if HTTPS server is running...");
    const httpsResult = await this.checkServer(this.httpsPort, "https");

    if (httpsResult.running) {
      console.log(`✅ HTTPS server is running on port ${this.httpsPort}`);
      console.log(`🔐 Access: https://localhost:${this.httpsPort}`);
      console.log(`📊 Status: ${httpsResult.status}`);
      console.log("");
      console.log("⚠️  Browser Security Warning:");
      console.log("   Self-signed certificate will show security warning");
      console.log('   Click "Advanced" → "Proceed to localhost (unsafe)"');
      return true;
    } else {
      console.log(`❌ HTTPS server not running on port ${this.httpsPort}`);
      console.log("");
      console.log("🚀 To start HTTPS server:");
      console.log("   USE_HTTPS=true npm run dev");
      console.log("   npm run quick:https");
      return false;
    }
  }

  /**
   * Test both HTTP and HTTPS modes
   */
  async testBoth() {
    console.log("🔄 Testing Both HTTP and HTTPS Modes");
    console.log("====================================");
    console.log("");

    const httpRunning = await this.testHTTP();
    console.log("");
    const httpsRunning = await this.testHTTPS();

    console.log("");
    console.log("📋 Summary:");
    console.log(
      `   HTTP (${this.httpPort}):  ${
        httpRunning ? "✅ Running" : "❌ Not Running"
      }`
    );
    console.log(
      `   HTTPS (${this.httpsPort}): ${
        httpsRunning ? "✅ Running" : "❌ Not Running"
      }`
    );

    if (!httpRunning && !httpsRunning) {
      console.log("");
      console.log("🚀 Quick Start Commands:");
      console.log("   npm run quick:http    # Start HTTP server");
      console.log("   npm run quick:https   # Start HTTPS server");
    }
  }

  /**
   * Interactive mode - let user choose what to test
   */
  interactive() {
    console.log("🎯 CollabSpace SSL Interactive Testing");
    console.log("======================================");
    console.log("");
    console.log("What would you like to test?");
    console.log("");
    console.log("1. 🔓 Test HTTP mode (port 3000)");
    console.log("2. 🔒 Test HTTPS mode (port 3443)");
    console.log("3. 🔄 Test both modes");
    console.log("4. 🔍 Check SSL certificate status");
    console.log("5. 🌐 Show access URLs");
    console.log("6. 🔧 Setup SSL certificates");
    console.log("");
    console.log("💡 Or use direct commands:");
    console.log("   npm run test:http");
    console.log("   npm run test:https");
    console.log("   npm run quick:http");
    console.log("   npm run quick:https");
  }

  /**
   * Run the specified command
   */
  async run(command) {
    switch (command) {
      case "http":
        await this.testHTTP();
        break;

      case "https":
        await this.testHTTPS();
        break;

      case "both":
        await this.testBoth();
        break;

      case "check":
        this.checkSSLStatus();
        break;

      case "urls":
        this.showURLs();
        break;

      case "setup":
        try {
          await this.setupSSL();
        } catch (error) {
          console.error("Setup failed:", error);
        }
        break;

      case "help":
      case "--help":
      case "-h":
        this.showHelp();
        break;

      default:
        if (command) {
          console.log(`❌ Unknown command: ${command}`);
          console.log("");
        }
        this.interactive();
        break;
    }
  }
}

// Main execution
async function main() {
  const tester = new SSLTester();
  const command = process.argv[2];

  try {
    await tester.run(command);
  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = SSLTester;
