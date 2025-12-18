const redis = require("redis");

let client;

async function connectRedis() {
  try {
    // Skip Redis connection in test environment to avoid connection errors
    if (process.env.NODE_ENV === "test") {
      console.log("Test environment detected, skipping Redis connection");
      return null;
    }

    // Create Redis client configuration optimized for Redis Cloud
    const redisConfig = {
      socket: {
        connectTimeout: 60000, // Longer timeout for cloud connections (60 seconds)
        lazyConnect: false, // Connect immediately
        tls: false, // Redis Cloud free tier doesn't use TLS
        keepAlive: 30000, // Keep connection alive
        reconnectStrategy: (retries) => {
          if (retries > 5) {
            console.log("Redis max reconnection attempts reached, giving up");
            return false; // Stop reconnecting after 5 attempts
          }
          console.log(`Redis reconnection attempt ${retries}`);
          return Math.min(retries * 1000, 5000); // Exponential backoff, max 5s
        },
      },
      // Legacy retry strategy for older redis versions
      retry_strategy: (options) => {
        if (options.error) {
          if (
            options.error.code === "ECONNREFUSED" ||
            options.error.code === "ENOTFOUND" ||
            options.error.code === "ETIMEDOUT"
          ) {
            console.error(`Redis connection error: ${options.error.code}`);
            return false; // Don't retry on these errors
          }
        }
        if (options.total_retry_time > 1000 * 60 * 5) {
          // End reconnection after 5 minutes
          return new Error("Redis retry time exhausted");
        }
        if (options.attempt > 3) {
          // End reconnection after 3 attempts
          return new Error("Redis max retry attempts exceeded");
        }
        // Reconnect after
        return Math.min(options.attempt * 100, 1000);
      },
    };

    // Check if Redis Cloud credentials are available
    if (
      process.env.REDIS_HOST &&
      process.env.REDIS_PORT &&
      process.env.REDIS_PASSWORD
    ) {
      // Use Redis Cloud configuration
      redisConfig.username = process.env.REDIS_USERNAME || "default";
      redisConfig.password = process.env.REDIS_PASSWORD;
      redisConfig.socket.host = process.env.REDIS_HOST;
      redisConfig.socket.port = parseInt(process.env.REDIS_PORT);
    } else if (process.env.REDIS_URL) {
      // Use Redis URL configuration
      redisConfig.url = process.env.REDIS_URL;
    } else {
      // Use local Redis configuration
      redisConfig.url = "redis://localhost:6379";
    }

    client = redis.createClient(redisConfig);

    // Handle Redis connection events
    client.on("connect", () => {
      // Redis connected
    });

    client.on("ready", () => {
      console.log("✓ Redis Connected");
    });

    client.on("error", (err) => {
      console.error("Redis client error:", err);
      // Don't let Redis errors crash the app or spam logs
      if (
        err.code === "ENOTFOUND" ||
        err.code === "ETIMEDOUT" ||
        err.code === "ConnectionTimeoutError"
      ) {
        console.log(
          "Redis connection failed, continuing without Redis features"
        );
        // Set client to null to stop further attempts
        client = null;
      }
    });

    client.on("end", () => {
      // Redis connection closed
    });

    // Connect to Redis with timeout
    const connectionPromise = client.connect();
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("Redis connection timeout")), 15000);
    });

    await Promise.race([connectionPromise, timeoutPromise]);

    return client;
  } catch (error) {
    console.error("Failed to connect to Redis:", error.message);
    console.log(
      "Application will continue without Redis caching and real-time features"
    );
    // Don't throw error to allow app to continue without Redis
    client = null;
    return null;
  }
}

function getRedisClient() {
  return client;
}

async function disconnectRedis() {
  if (client) {
    try {
      await client.disconnect();
      console.log("Redis client disconnected");
    } catch (error) {
      console.error("Error disconnecting Redis:", error);
    }
  }
}

// Cache helper functions
async function setCache(key, value, ttl = 3600) {
  if (!client || !client.isReady) {
    console.log("Redis not available, skipping cache set");
    return false;
  }

  try {
    const serializedValue = JSON.stringify(value);
    await client.setEx(key, ttl, serializedValue);
    return true;
  } catch (error) {
    console.error("Redis cache set error:", error);
    return false;
  }
}

async function getCache(key) {
  if (!client || !client.isReady) {
    console.log("Redis not available, skipping cache get");
    return null;
  }

  try {
    const cachedValue = await client.get(key);
    if (cachedValue) {
      return JSON.parse(cachedValue);
    }
    return null;
  } catch (error) {
    console.error("Redis cache get error:", error);
    return null;
  }
}

async function deleteCache(key) {
  if (!client || !client.isReady) {
    console.log("Redis not available, skipping cache delete");
    return false;
  }

  try {
    await client.del(key);
    return true;
  } catch (error) {
    console.error("Redis cache delete error:", error);
    return false;
  }
}

async function invalidatePattern(pattern) {
  if (!client || !client.isReady) {
    console.log("Redis not available, skipping pattern invalidation");
    return false;
  }

  try {
    const keys = await client.keys(pattern);
    if (keys.length > 0) {
      await client.del(keys);
    }
    return true;
  } catch (error) {
    console.error("Redis pattern invalidation error:", error);
    return false;
  }
}

// Session store helper functions
async function getSession(sessionId) {
  if (!client || !client.isReady) {
    return null;
  }

  try {
    const sessionData = await client.get(`sess:${sessionId}`);
    return sessionData ? JSON.parse(sessionData) : null;
  } catch (error) {
    console.error("Redis session get error:", error);
    return null;
  }
}

async function setSession(sessionId, sessionData, ttl = 86400) {
  if (!client || !client.isReady) {
    return false;
  }

  try {
    await client.setEx(`sess:${sessionId}`, ttl, JSON.stringify(sessionData));
    return true;
  } catch (error) {
    console.error("Redis session set error:", error);
    return false;
  }
}

module.exports = {
  connectRedis,
  getRedisClient,
  disconnectRedis,
  setCache,
  getCache,
  deleteCache,
  invalidatePattern,
  getSession,
  setSession,
};
