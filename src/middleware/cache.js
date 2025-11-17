const {
  getCache,
  setCache,
  deleteCache,
  invalidatePattern,
} = require("../config/redis");

/**
 * Redis caching middleware for Express routes
 * @param {number} ttl - Time to live in seconds (default: 1 hour)
 * @param {function} keyGenerator - Function to generate cache key from req object
 */
function cacheMiddleware(ttl = 3600, keyGenerator = null) {
  return async (req, res, next) => {
    // Skip caching if Redis is not available
    const redisClient = require("../config/redis").getRedisClient();
    if (!redisClient || !redisClient.isReady) {
      return next();
    }

    try {
      // Generate cache key
      let cacheKey;
      if (keyGenerator && typeof keyGenerator === "function") {
        cacheKey = keyGenerator(req);
      } else {
        // Default key generation based on route and user
        const userId = req.session?.user?.id || "anonymous";
        const route = req.route?.path || req.path;
        const method = req.method;
        const queryString =
          Object.keys(req.query).length > 0 ? JSON.stringify(req.query) : "";
        cacheKey = `cache:${method}:${route}:${userId}:${queryString}`;
      }

      // Try to get cached response
      const cachedResponse = await getCache(cacheKey);
      if (cachedResponse) {
        return res.json(cachedResponse);
      }

      // Store original res.json function
      const originalJson = res.json;

      // Override res.json to cache the response
      res.json = function (data) {
        // Cache successful responses (2xx status codes)
        if (res.statusCode >= 200 && res.statusCode < 300) {
          setCache(cacheKey, data, ttl)
            .then(() => {
              // Response cached
            })
            .catch((err) => {
              console.error("Failed to cache response:", err);
            });
        }

        // Call original json function
        return originalJson.call(this, data);
      };

      next();
    } catch (error) {
      console.error("Cache middleware error:", error);
      next();
    }
  };
}

/**
 * Cache invalidation middleware
 * Invalidates cache based on patterns when data is modified
 */
function invalidateCacheMiddleware(patterns) {
  return async (req, res, next) => {
    // Store original methods
    const originalJson = res.json;
    const originalSend = res.send;

    // Override response methods to invalidate cache after successful operations
    const invalidateCache = async () => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        try {
          for (const pattern of patterns) {
            let actualPattern = pattern;

            // Replace placeholders in pattern with actual values
            if (typeof pattern === "function") {
              actualPattern = pattern(req);
            } else {
              // Replace common placeholders
              actualPattern = pattern
                .replace(":userId", req.session?.user?.id || "*")
                .replace(
                  ":teamId",
                  req.params?.teamId || req.body?.teamId || "*",
                )
                .replace(
                  ":taskId",
                  req.params?.taskId || req.body?.taskId || "*",
                );
            }

            await invalidatePattern(actualPattern);
            // Cache invalidated
          }
        } catch (error) {
          console.error("Cache invalidation error:", error);
        }
      }
    };

    res.json = function (data) {
      invalidateCache();
      return originalJson.call(this, data);
    };

    res.send = function (data) {
      invalidateCache();
      return originalSend.call(this, data);
    };

    next();
  };
}

/**
 * User-specific cache invalidation
 */
function invalidateUserCache(userId) {
  return invalidatePattern(`cache:*:*:${userId}:*`);
}

/**
 * Team-specific cache invalidation
 */
function invalidateTeamCache(teamId) {
  return invalidatePattern(`cache:*:*:*:*${teamId}*`);
}

/**
 * Clear all cache
 */
function clearAllCache() {
  return invalidatePattern("cache:*");
}

module.exports = {
  cacheMiddleware,
  invalidateCacheMiddleware,
  invalidateUserCache,
  invalidateTeamCache,
  clearAllCache,
};
