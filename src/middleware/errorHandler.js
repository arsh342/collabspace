const logger = require("./logger");

// Custom AppError class
class AppError extends Error {
  constructor(message, statusCode, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.status = `${statusCode}`.startsWith("4") ? "fail" : "error";

    Error.captureStackTrace(this, this.constructor);
  }
}

// Async error wrapper
const catchAsync = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Global error handler middleware
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error
  logger.logger.error("Error occurred:", {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get("User-Agent"),
  });

  // Mongoose bad ObjectId
  if (err.name === "CastError") {
    const message = "Resource not found";
    error = new AppError(message, 404);
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    const message = `Duplicate field value: ${field}. Please use another value.`;
    error = new AppError(message, 400);
  }

  // Mongoose validation error
  if (err.name === "ValidationError") {
    const message = Object.values(err.errors)
      .map((val) => val.message)
      .join(", ");
    error = new AppError(message, 400);
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    const message = "Invalid token. Please log in again.";
    error = new AppError(message, 401);
  }

  if (err.name === "TokenExpiredError") {
    const message = "Token expired. Please log in again.";
    error = new AppError(message, 401);
  }

  // Multer errors
  if (err.code === "LIMIT_FILE_SIZE") {
    const message = "File too large. Maximum size is 5MB.";
    error = new AppError(message, 400);
  }

  if (err.code === "LIMIT_UNEXPECTED_FILE") {
    const message = "Unexpected file field.";
    error = new AppError(message, 400);
  }

  // Rate limiting errors
  if (err.status === 429) {
    const message = "Too many requests. Please try again later.";
    error = new AppError(message, 429);
  }

  // Default error
  if (!error.statusCode) {
    error.statusCode = 500;
    error.message = "Internal Server Error";
  }

  // Development error response
  if (process.env.NODE_ENV === "development") {
    return res.status(error.statusCode).json({
      success: false,
      error: {
        message: error.message,
        statusCode: error.statusCode,
        stack: error.stack,
        ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
      },
    });
  }

  // Production error response
  if (error.isOperational) {
    return res.status(error.statusCode).json({
      success: false,
      message: error.message,
    });
  } else {
    // Programming or unknown errors: don't leak error details
    return res.status(500).json({
      success: false,
      message: "Something went wrong",
    });
  }
};

// 404 handler for undefined routes
const notFound = (req, res, next) => {
  const error = new AppError(`Route ${req.originalUrl} not found`, 404);
  next(error);
};

// Handle unhandled promise rejections
process.on("unhandledRejection", (err) => {
  logger.logger.error("Unhandled Promise Rejection:", err);
  process.exit(1);
});

// Handle uncaught exceptions
process.on("uncaughtException", (err) => {
  logger.logger.error("Uncaught Exception:", err);
  process.exit(1);
});

module.exports = {
  AppError,
  catchAsync,
  errorHandler,
  notFound,
};
