const fs = require("fs");
const path = require("path");

// Ensure logs directory exists
const logsDir = path.join(process.cwd(), "logs");
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const logFile = path.join(logsDir, "app.log");

// Custom logger class
class Logger {
  constructor() {
    this.logLevel = process.env.LOG_LEVEL || "info";
    this.levels = {
      error: 0,
      warn: 1,
      info: 2,
      debug: 3,
    };
  }

  _shouldLog(level) {
    return this.levels[level] <= this.levels[this.logLevel];
  }

  _formatMessage(level, message, meta = {}) {
    const timestamp = new Date().toISOString();
    const metaStr =
      Object.keys(meta).length > 0 ? ` | ${JSON.stringify(meta)}` : "";
    return `[${timestamp}] ${level.toUpperCase()}: ${message}${metaStr}`;
  }

  _writeToFile(message) {
    try {
      fs.appendFileSync(logFile, message + "\n");
    } catch (error) {
      console.error("Error writing to log file:", error);
    }
  }

  _log(level, message, meta = {}) {
    if (!this._shouldLog(level)) return;

    const formattedMessage = this._formatMessage(level, message, meta);

    // Console output
    switch (level) {
      case "error":
        console.error(formattedMessage);
        break;
      case "warn":
        console.warn(formattedMessage);
        break;
      case "info":
        console.info(formattedMessage);
        break;
      case "debug":
        console.debug(formattedMessage);
        break;
      default:
        console.log(formattedMessage);
    }

    // File output
    this._writeToFile(formattedMessage);
  }

  error(message, meta = {}) {
    this._log("error", message, meta);
  }

  warn(message, meta = {}) {
    this._log("warn", message, meta);
  }

  info(message, meta = {}) {
    this._log("info", message, meta);
  }

  debug(message, meta = {}) {
    this._log("debug", message, meta);
  }
}

const logger = new Logger();

// Express middleware
const loggerMiddleware = (req, res, next) => {
  // Skip logging for Chrome DevTools requests
  if (req.originalUrl.includes(".well-known/appspecific/com.chrome.devtools")) {
    return next();
  }

  const start = Date.now();

  // Log request
  logger.info(`${req.method} ${req.originalUrl}`, {
    ip: req.ip,
    userAgent: req.get("User-Agent"),
    timestamp: new Date().toISOString(),
  });

  // Log response
  res.on("finish", () => {
    const duration = Date.now() - start;
    logger.info(`${req.method} ${req.originalUrl} - ${res.statusCode}`, {
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
    });
  });

  next();
};

module.exports = { logger, loggerMiddleware };
