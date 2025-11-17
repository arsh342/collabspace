const redis = require("redis");

let client;

async function connectRedis() {
  try {
    // Create Redis client
    client = redis.createClient({
      url: process.env.REDIS_URL || "redis://localhost:6379",
      password: process.env.REDIS_PASSWORD,
      socket: {
        connectTimeout: 10000,
        lazyConnect: true,
      },
      retry_strategy: (options) => {
        if (options.error && options.error.code === "ECONNREFUSED") {
          // End reconnection on specific error and flush all commands with an error
          console.error("Redis connection refused");
          return new Error("Redis connection refused");
        }
        if (options.total_retry_time > 1000 * 60 * 60) {
          // End reconnection after hour
          return new Error("Redis retry time exhausted");
        }
        if (options.attempt > 10) {
          // End reconnection after 10 attempts
          return new Error("Redis max retry attempts exceeded");
        }
        // Reconnect after
        return Math.min(options.attempt * 100, 3000);
      },
    });

    // Handle Redis connection events
    client.on("connect", () => {
      console.log("Connected to Redis server");
    });

    client.on("ready", () => {
      console.log("Redis client ready to use");
    });

    client.on("error", (err) => {
      console.error("Redis client error:", err);
    });

    client.on("end", () => {
      console.log("Redis connection closed");
    });

    // Connect to Redis
    await client.connect();

    return client;
  } catch (error) {
    console.error("Failed to connect to Redis:", error);
    // Don't throw error to allow app to continue without Redis
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
