const STATIC_EXTENSIONS = [".png", ".jpg", ".jpeg", ".gif", ".svg", ".css", ".js", ".ico"];

function shouldSkipPath(url) {
  if (!url) return false;
  if (process.env.LOG_SKIP_STATIC === "false") return false;

  return (
    url.startsWith("/public/") ||
    url.startsWith("/uploads/") ||
    STATIC_EXTENSIONS.some((ext) => url.toLowerCase().endsWith(ext))
  );
}

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
    const metaStr = Object.entries(meta)
      .filter(([, value]) => value !== undefined && value !== null && value !== "")
      .map(([key, value]) => `${key}=${value}`)
      .join(" ");
    return metaStr
      ? `[${timestamp}] ${level.toUpperCase()}: ${message} | ${metaStr}`
      : `[${timestamp}] ${level.toUpperCase()}: ${message}`;
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

  if (shouldSkipPath(req.originalUrl)) {
    return next();
  }

  const start = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - start;
    const meta = {
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
    };

    if (process.env.LOG_INCLUDE_UA === "true") {
      meta.userAgent = req.get("User-Agent");
    }

    logger.info(`${req.method} ${req.originalUrl}`, meta);
  });

  next();
};

module.exports = { logger, loggerMiddleware };
