const mongoose = require("mongoose");
const logger = require("../middleware/logger");

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(
      process.env.MONGODB_URI || "mongodb://localhost:27017/collabspace"
    );

    logger.logger.info(`MongoDB Connected: ${conn.connection.host}`);

    // Handle connection events
    mongoose.connection.on("error", (err) => {
      logger.logger.error("MongoDB connection error:", err);
    });

    mongoose.connection.on("disconnected", () => {
      logger.logger.warn("MongoDB disconnected");
    });

    mongoose.connection.on("reconnected", () => {
      logger.logger.info("MongoDB reconnected");
    });

    // Graceful shutdown
    process.on("SIGINT", async () => {
      try {
        await mongoose.connection.close();
        logger.logger.info("MongoDB connection closed through app termination");
        process.exit(0);
      } catch (err) {
        logger.logger.error("Error during MongoDB disconnection:", err);
        process.exit(1);
      }
    });
  } catch (error) {
    logger.logger.error("Error connecting to MongoDB:", error);
    // Don't exit the process, just log the error
    // process.exit(1);
  }
};

module.exports = connectDB;
