#!/usr/bin/env node

/**
 * SSL Certificate Management Script for CollabSpace
 * Usage: node scripts/ssl-manager.js [command] [options]
 */

const fs = require("fs");
const path = require("path");
const selfsigned = require("selfsigned");

class SSLCertificateManager {
  constructor() {
    this.sslDir = path.join(__dirname, "../ssl");
    this.certPath = path.join(this.sslDir, "cert.pem");
    this.keyPath = path.join(this.sslDir, "key.pem");
  }

  /**
   * Generate self-signed certificates for development
   */
  generateSelfSigned(options = {}) {
    const {
      commonName = "localhost",
      organization = "CollabSpace Development",
      country = "US",
      state = "California",
      city = "San Francisco",
      keySize = 2048,
      days = 365,
    } = options;

    console.log("🔐 Generating self-signed SSL certificates...");

    // Ensure SSL directory exists
    if (!fs.existsSync(this.sslDir)) {
      fs.mkdirSync(this.sslDir, { recursive: true });
      console.log(`📁 Created SSL directory: ${this.sslDir}`);
    }

    const attrs = [
      { name: "commonName", value: commonName },
      { name: "countryName", value: country },
      { shortName: "ST", value: state },
      { name: "localityName", value: city },
      { name: "organizationName", value: organization },
      { shortName: "OU", value: "Development Team" },
    ];

    const certOptions = {
      keySize,
      days,
      algorithm: "sha256",
      extensions: [
        {
          name: "keyUsage",
          keyCertSign: true,
          digitalSignature: true,
          nonRepudiation: true,
          keyEncipherment: true,
          dataEncipherment: true,
        },
        {
          name: "extKeyUsage",
          serverAuth: true,
          clientAuth: true,
          codeSigning: false,
          emailProtection: false,
          timeStamping: false,
        },
        {
          name: "subjectAltName",
          altNames: [
            { type: 2, value: "localhost" },
            { type: 2, value: "127.0.0.1" },
            { type: 2, value: "::1" },
            { type: 7, ip: "127.0.0.1" },
            { type: 7, ip: "::1" },
            // Add common development domains
            { type: 2, value: "collabspace.local" },
            { type: 2, value: "dev.collabspace.local" },
          ],
        },
      ],
    };

    try {
      const pems = selfsigned.generate(attrs, certOptions);

      // Write certificates to files
      fs.writeFileSync(this.certPath, pems.cert);
      fs.writeFileSync(this.keyPath, pems.private);

      console.log("✅ Self-signed certificates generated successfully!");
      console.log(`📄 Certificate: ${this.certPath}`);
      console.log(`🔑 Private Key: ${this.keyPath}`);
      console.log(`⏰ Valid for: ${days} days`);
      console.log("");
      console.log("🌐 Valid for the following domains:");
      console.log("   • localhost");
      console.log("   • 127.0.0.1");
      console.log("   • ::1");
      console.log("   • collabspace.local");
      console.log("   • dev.collabspace.local");
      console.log("");
      console.log("⚠️  Browser Security Warning:");
      console.log(
        "   Self-signed certificates will show a security warning in browsers."
      );
      console.log(
        '   Click "Advanced" → "Proceed to localhost (unsafe)" to continue.'
      );
      console.log("");
      console.log("🚀 Start server with HTTPS:");
      console.log("   USE_HTTPS=true npm run dev");

      return true;
    } catch (error) {
      console.error("❌ Error generating certificates:", error.message);
      return false;
    }
  }

  /**
   * Install production certificates
   */
  installProduction(certFile, keyFile) {
    console.log("📦 Installing production certificates...");

    if (!fs.existsSync(certFile)) {
      console.error(`❌ Certificate file not found: ${certFile}`);
      return false;
    }

    if (!fs.existsSync(keyFile)) {
      console.error(`❌ Private key file not found: ${keyFile}`);
      return false;
    }

    try {
      // Ensure SSL directory exists
      if (!fs.existsSync(this.sslDir)) {
        fs.mkdirSync(this.sslDir, { recursive: true });
      }

      // Copy certificates
      fs.copyFileSync(certFile, this.certPath);
      fs.copyFileSync(keyFile, this.keyPath);

      console.log("✅ Production certificates installed successfully!");
      console.log(`📄 Certificate: ${this.certPath}`);
      console.log(`🔑 Private Key: ${this.keyPath}`);
      console.log("");
      console.log("🔒 Production SSL is now ready!");
      console.log("   Set NODE_ENV=production to enable automatic HTTPS");

      return true;
    } catch (error) {
      console.error("❌ Error installing certificates:", error.message);
      return false;
    }
  }

  /**
   * Check certificate status
   */
  status() {
    console.log("🔍 SSL Certificate Status");
    console.log("========================");

    const certExists = fs.existsSync(this.certPath);
    const keyExists = fs.existsSync(this.keyPath);

    console.log(
      `📄 Certificate file: ${certExists ? "✅" : "❌"} ${this.certPath}`
    );
    console.log(
      `🔑 Private key file: ${keyExists ? "✅" : "❌"} ${this.keyPath}`
    );

    if (certExists && keyExists) {
      try {
        const cert = fs.readFileSync(this.certPath, "utf8");
        const certData = require("crypto")
          .createHash("sha256")
          .update(cert)
          .digest("hex");

        console.log(
          `🔖 Certificate fingerprint: ${certData.substring(0, 32)}...`
        );
        console.log("✅ SSL certificates are ready for use");
        console.log("");
        console.log("🚀 To use HTTPS:");
        console.log("   USE_HTTPS=true npm run dev");
      } catch (error) {
        console.log("❌ Error reading certificate:", error.message);
      }
    } else {
      console.log("");
      console.log("💡 To generate certificates:");
      console.log("   node scripts/ssl-manager.js generate");
    }
  }

  /**
   * Remove certificates
   */
  remove() {
    console.log("🗑️  Removing SSL certificates...");

    let removed = 0;

    if (fs.existsSync(this.certPath)) {
      fs.unlinkSync(this.certPath);
      console.log(`✅ Removed: ${this.certPath}`);
      removed++;
    }

    if (fs.existsSync(this.keyPath)) {
      fs.unlinkSync(this.keyPath);
      console.log(`✅ Removed: ${this.keyPath}`);
      removed++;
    }

    if (removed === 0) {
      console.log("ℹ️  No certificates found to remove");
    } else {
      console.log(`🗑️  Removed ${removed} certificate files`);
    }
  }

  /**
   * Show help information
   */
  showHelp() {
    console.log("🔐 SSL Certificate Manager for CollabSpace");
    console.log("==========================================");
    console.log("");
    console.log("Usage: node scripts/ssl-manager.js [command] [options]");
    console.log("");
    console.log("Commands:");
    console.log(
      "  generate       Generate self-signed certificates for development"
    );
    console.log("  install        Install production certificates");
    console.log("  status         Check certificate status");
    console.log("  remove         Remove existing certificates");
    console.log("  help           Show this help message");
    console.log("");
    console.log("Examples:");
    console.log("  node scripts/ssl-manager.js generate");
    console.log(
      "  node scripts/ssl-manager.js install /path/to/cert.pem /path/to/key.pem"
    );
    console.log("  node scripts/ssl-manager.js status");
    console.log("");
    console.log("Environment Variables:");
    console.log("  USE_HTTPS=true     Enable HTTPS mode");
    console.log("  FORCE_HTTPS=true   Force HTTPS in development");
    console.log("  HTTPS_PORT=3443    HTTPS port (default: 3443)");
    console.log("  HTTP_PORT=3000     HTTP port (default: 3000)");
  }
}

// Main execution
function main() {
  const manager = new SSLCertificateManager();
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case "generate":
      manager.generateSelfSigned();
      break;

    case "install":
      const certFile = args[1];
      const keyFile = args[2];

      if (!certFile || !keyFile) {
        console.error(
          "❌ Usage: node ssl-manager.js install <cert-file> <key-file>"
        );
        process.exit(1);
      }

      manager.installProduction(certFile, keyFile);
      break;

    case "status":
      manager.status();
      break;

    case "remove":
      manager.remove();
      break;

    case "help":
    case "--help":
    case "-h":
      manager.showHelp();
      break;

    default:
      if (command) {
        console.error(`❌ Unknown command: ${command}`);
        console.log("");
      }
      manager.showHelp();
      break;
  }
}

if (require.main === module) {
  main();
}

module.exports = SSLCertificateManager;
