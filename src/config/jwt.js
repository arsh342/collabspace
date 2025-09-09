const jwt = require("jsonwebtoken");
const logger = require("../middleware/logger");

const generateToken = (userId, role) => {
  try {
    return jwt.sign({ userId, role }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    });
  } catch (error) {
    logger.error("Error generating JWT token:", error);
    throw new Error("Failed to generate authentication token");
  }
};

const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      throw new Error("Token has expired");
    } else if (error.name === "JsonWebTokenError") {
      throw new Error("Invalid token");
    } else {
      logger.error("JWT verification error:", error);
      throw new Error("Token verification failed");
    }
  }
};

const decodeToken = (token) => {
  try {
    return jwt.decode(token);
  } catch (error) {
    logger.error("Error decoding JWT token:", error);
    return null;
  }
};

module.exports = {
  generateToken,
  verifyToken,
  decodeToken,
};
