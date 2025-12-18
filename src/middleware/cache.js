const {
  getCache,
  setCache,
  deleteCache,
  invalidatePattern,
} = require("../config/redis");

/**
 * Redis caching middleware for Express routes - ONLY for essential real-time data
 * Use this ONLY for:
 * - Real-time notifications
 * - Live message counts
 * - Online user status
 * - Cross-session data that needs to be shared immediately
 *
 * @param {number} ttl - Time to live in seconds (default: 5 minutes for real-time data)
 * @param {function} keyGenerator - Function to generate cache key from req object
 * @param {boolean} forceCache - Force caching even for non-essential data (use sparingly)
 */
function cacheMiddleware(ttl = 300, keyGenerator = null, forceCache = false) {
  return async (req, res, next) => {
    // Skip caching if Redis is not available
    const redisClient = require("../config/redis").getRedisClient();
    if (!redisClient || !redisClient.isReady) {
      return next();
    }

    // Only cache essential real-time data unless forced
    if (!forceCache && !isEssentialRealTimeRoute(req)) {
      // Add header to indicate this should be cached client-side
      res.setHeader("X-Cache-Strategy", "client-side");
      res.setHeader("X-Cache-TTL", ttl.toString());
      return next();
    }

    try {
      // Generate cache key
      let cacheKey;
      if (keyGenerator && typeof keyGenerator === "function") {
        cacheKey = keyGenerator(req);
      } else {
        // Default key generation for real-time data
        const userId = req.session?.userId || req.user?._id || "anonymous";
        const route = req.route?.path || req.path;
        const method = req.method;
        cacheKey = `realtime:${method}:${route}:${userId}`;
      }

      // Try to get cached response
      const cachedResponse = await getCache(cacheKey);
      if (cachedResponse) {
        console.log(`✅ Redis cache hit: ${cacheKey}`);
        res.setHeader("X-Cache-Hit", "redis");
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
              console.log(`💾 Redis cached: ${cacheKey} (TTL: ${ttl}s)`);
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
 * Determine if a route contains essential real-time data that should be Redis cached
 * @param {Object} req - Express request object
 * @returns {boolean} - True if route should be Redis cached
 */
function isEssentialRealTimeRoute(req) {
  const route = req.route?.path || req.path;
  const method = req.method;

  // Only cache these essential real-time routes in Redis:
  const essentialRoutes = [
    // Real-time notifications and counts
    "/api/notifications/unread-count",
    "/api/messages/unread-count",

    // Live online status (for real-time updates)
    "/api/users/online-status",
    "/api/teams/:id/online-members",

    // Real-time message updates (last few messages only)
    "/api/messages/latest",

    // Cross-session critical data
    "/api/auth/session-status",
    "/api/users/active-sessions",
  ];

  // Check if current route matches essential routes
  return essentialRoutes.some((essentialRoute) => {
    // Handle parameterized routes
    const routePattern = essentialRoute.replace(/:\w+/g, "[^/]+");
    const regex = new RegExp(`^${routePattern}$`);
    return regex.test(route) && method === "GET";
  });
}

/**
 * Cache invalidation middleware - ONLY for Redis real-time data
 * Use sparingly and only for essential real-time patterns
 */
function invalidateCacheMiddleware(patterns, realTimeOnly = true) {
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
              // Only process real-time patterns if realTimeOnly is true
              if (realTimeOnly && !isRealTimePattern(pattern)) {
                console.log(
                  `⏭️  Skipping non-real-time pattern: ${pattern} (use client-side cache)`
                );
                continue;
              }

              // Replace common placeholders for real-time patterns only
              actualPattern = pattern
                .replace(":userId", req.session?.userId || req.user?._id || "*")
                .replace(
                  ":teamId",
                  req.params?.teamId || req.body?.teamId || "*"
                );
            }

            await invalidatePattern(actualPattern);
            console.log(`🗑️  Redis cache invalidated: ${actualPattern}`);
          }

          // Always notify clients about data updates for client-side cache invalidation
          try {
            notifyClientsOfDataUpdate(req, res, patterns);
          } catch (notifyError) {
            console.error("Client notification error:", notifyError);
            // Cache invalidated
          }
        } catch (error) {
          console.error("Cache invalidation error:", error);
        }
      }
    };

    res.json = function (data) {
      const result = originalJson.call(this, data);
      invalidateCache();
      return result;
    };

    res.send = function (data) {
      const result = originalSend.call(this, data);
      invalidateCache();
      return result;
    };

    next();
  };
}

/**
 * Check if a pattern represents real-time data that should be in Redis
 */
function isRealTimePattern(pattern) {
  const realTimePatterns = [
    "realtime:*",
    "online:*",
    "notifications:*",
    "unread-count:*",
    "active-sessions:*",
  ];

  return realTimePatterns.some((rtPattern) => {
    const regex = new RegExp(rtPattern.replace("*", ".*"));
    return regex.test(pattern);
  });
}

/**
 * Notify clients about data updates for client-side cache invalidation
 */
function notifyClientsOfDataUpdate(req, res, patterns) {
  // Add headers to tell client which cache to invalidate
  const cacheInvalidationHints = patterns.map((pattern) => {
    if (pattern.includes("team")) return "teams";
    if (pattern.includes("task")) return "tasks";
    if (pattern.includes("user")) return "users";
    if (pattern.includes("message")) return "messages";
    if (pattern.includes("stats")) return "dashboard";
    return "general";
  });

  // Set header for client-side cache invalidation
  if (cacheInvalidationHints.length > 0 && res && res.setHeader) {
    res.setHeader(
      "X-Invalidate-Client-Cache",
      cacheInvalidationHints.join(",")
    );
  }
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
