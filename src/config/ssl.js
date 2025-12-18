const fs = require("fs");
const path = require("path");
const https = require("https");
const selfsigned = require("selfsigned");

/**
 * SSL Configuration Manager for CollabSpace
 * Supports development self-signed certificates and production SSL
 */
class SSLManager {
  constructor() {
    this.sslDir = path.join(__dirname, "../../ssl");
    this.certPath = path.join(this.sslDir, "cert.pem");
    this.keyPath = path.join(this.sslDir, "key.pem");
    this.isProduction = process.env.NODE_ENV === "production";
    this.forceHTTPS = process.env.FORCE_HTTPS === "true";
  }

  /**
   * Initialize SSL configuration
   */
  async initialize() {
    try {
      // Create SSL directory if it doesn't exist
      if (!fs.existsSync(this.sslDir)) {
        fs.mkdirSync(this.sslDir, { recursive: true });
      }

      // Check if we should use HTTPS
      if (this.shouldUseHTTPS()) {
        await this.ensureCertificates();
        return true;
      }

      return false;
    } catch (error) {
      console.error("SSL initialization error:", error);
      return false;
    }
  }

  /**
   * Check if HTTPS should be used
   */
  shouldUseHTTPS() {
    return (
      this.isProduction || this.forceHTTPS || process.env.USE_HTTPS === "true"
    );
  }

  /**
   * Ensure SSL certificates exist (create self-signed for development)
   */
  async ensureCertificates() {
    if (this.certificatesExist()) {
      console.log("📋 Using existing SSL certificates");
      return;
    }

    if (this.isProduction) {
      throw new Error(
        "Production SSL certificates not found. Please provide valid certificates."
      );
    }

    // Generate self-signed certificates for development
    console.log(
      "🔐 Generating self-signed SSL certificates for development..."
    );
    await this.generateSelfSignedCertificates();
  }

  /**
   * Check if certificates exist
   */
  certificatesExist() {
    return fs.existsSync(this.certPath) && fs.existsSync(this.keyPath);
  }

  /**
   * Generate self-signed certificates for development
   */
  async generateSelfSignedCertificates() {
    const attrs = [
      { name: "commonName", value: "localhost" },
      { name: "countryName", value: "US" },
      { shortName: "ST", value: "California" },
      { name: "localityName", value: "San Francisco" },
      { name: "organizationName", value: "CollabSpace Dev" },
      { shortName: "OU", value: "Development" },
    ];

    const options = {
      keySize: 2048,
      days: 365,
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
            { type: 7, ip: "127.0.0.1" },
            { type: 7, ip: "::1" },
          ],
        },
      ],
    };

    const pems = selfsigned.generate(attrs, options);

    // Write certificates to files
    fs.writeFileSync(this.certPath, pems.cert);
    fs.writeFileSync(this.keyPath, pems.private);

    console.log("✅ Self-signed certificates generated successfully");
    console.log(`📄 Certificate: ${this.certPath}`);
    console.log(`🔑 Private Key: ${this.keyPath}`);
    console.log(
      "⚠️  Note: Browser will show security warning for self-signed certificates"
    );
  }

  /**
   * Get SSL options for HTTPS server
   */
  getSSLOptions() {
    if (!this.certificatesExist()) {
      throw new Error("SSL certificates not found");
    }

    return {
      key: fs.readFileSync(this.keyPath),
      cert: fs.readFileSync(this.certPath),
      // Additional security options
      secureOptions:
        require("constants").SSL_OP_NO_TLSv1 |
        require("constants").SSL_OP_NO_TLSv1_1,
      ciphers: [
        "ECDHE-RSA-AES128-GCM-SHA256",
        "ECDHE-RSA-AES256-GCM-SHA384",
        "ECDHE-RSA-AES128-SHA256",
        "ECDHE-RSA-AES256-SHA384",
      ].join(":"),
      honorCipherOrder: true,
    };
  }

  /**
   * Create HTTPS server
   */
  createHTTPSServer(app) {
    const options = this.getSSLOptions();
    return https.createServer(options, app);
  }

  /**
   * Get the appropriate server URL
   */
  getServerURL(port) {
    const protocol = this.shouldUseHTTPS() ? "https" : "http";
    const host = process.env.HOST || "localhost";
    return `${protocol}://${host}:${port}`;
  }

  /**
   * HTTPS redirect middleware for production
   */
  httpsRedirectMiddleware() {
    return (req, res, next) => {
      if (this.isProduction && req.header("x-forwarded-proto") !== "https") {
        res.redirect(`https://${req.header("host")}${req.url}`);
      } else {
        next();
      }
    };
  }

  /**
   * Security headers middleware
   */
  securityHeadersMiddleware() {
    return (req, res, next) => {
      if (this.shouldUseHTTPS()) {
        // Strict Transport Security
        res.setHeader(
          "Strict-Transport-Security",
          "max-age=31536000; includeSubDomains; preload"
        );

        // Upgrade insecure requests
        res.setHeader("Content-Security-Policy", "upgrade-insecure-requests");
      }

      // Security headers for all requests
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.setHeader("X-Frame-Options", "DENY");
      res.setHeader("X-XSS-Protection", "1; mode=block");
      res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");

      next();
    };
  }

  /**
   * Install production certificates (for deployment)
   */
  installProductionCertificates(certContent, keyContent) {
    if (!this.isProduction) {
      throw new Error(
        "Production certificate installation only allowed in production environment"
      );
    }

    fs.writeFileSync(this.certPath, certContent);
    fs.writeFileSync(this.keyPath, keyContent);

    console.log("✅ Production SSL certificates installed");
  }

  /**
   * Get certificate information
   */
  getCertificateInfo() {
    if (!this.certificatesExist()) {
      return null;
    }

    try {
      const cert = fs.readFileSync(this.certPath, "utf8");
      const certData = require("crypto")
        .createHash("sha256")
        .update(cert)
        .digest("hex");

      return {
        exists: true,
        path: this.certPath,
        keyPath: this.keyPath,
        fingerprint: certData.substring(0, 16),
        isProduction: this.isProduction,
        httpsEnabled: this.shouldUseHTTPS(),
      };
    } catch (error) {
      return {
        exists: false,
        error: error.message,
      };
    }
  }
}

module.exports = SSLManager;
