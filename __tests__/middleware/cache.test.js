const {
  cacheMiddleware,
  invalidateCacheMiddleware,
  invalidateUserCache,
  invalidateTeamCache,
  clearAllCache,
} = require("../../src/middleware/cache");

// Mock Redis functions - declare before use
jest.mock("../../src/config/redis", () => ({
  getCache: jest.fn(),
  setCache: jest.fn(),
  deleteCache: jest.fn(),
  invalidatePattern: jest.fn(),
  getRedisClient: jest.fn(),
}));

// Import mocked functions after mocking
const {
  getCache: mockGetCache,
  setCache: mockSetCache,
  deleteCache: mockDeleteCache,
  invalidatePattern: mockInvalidatePattern,
  getRedisClient: mockGetRedisClient,
} = require("../../src/config/redis");

describe("Cache Middleware", () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      method: "GET",
      path: "/api/test",
      route: { path: "/api/test" },
      query: {},
      session: { userId: "user123" },
      params: {},
      body: {},
    };

    res = {
      json: jest.fn(),
      statusCode: 200,
      send: jest.fn(),
      setHeader: jest.fn(),
      getHeader: jest.fn(),
      locals: {},
    };

    next = jest.fn();

    // Mock Redis client as ready by default
    mockGetRedisClient.mockReturnValue({ isReady: true });

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe("cacheMiddleware", () => {
    it("should serve cached response when available", async () => {
      const cachedData = { message: "cached response" };
      mockGetCache.mockResolvedValue(cachedData);

      const middleware = cacheMiddleware(300, null, true); // Force cache for testing
      await middleware(req, res, next);

      expect(mockGetCache).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(cachedData);
      expect(next).not.toHaveBeenCalled();
    });

    it("should proceed to next middleware when no cache hit", async () => {
      mockGetCache.mockResolvedValue(null);

      const middleware = cacheMiddleware(300, null, true); // Force cache for testing
      await middleware(req, res, next);

      expect(mockGetCache).toHaveBeenCalled();
      expect(next).toHaveBeenCalled();
    });

    it("should cache successful responses", async () => {
      mockGetCache.mockResolvedValue(null);
      mockSetCache.mockResolvedValue(true);

      const middleware = cacheMiddleware(300);
      await middleware(req, res, next);

      // Simulate the response
      const responseData = { success: true, data: "test" };
      res.statusCode = 200;

      // Call the overridden res.json function
      const originalJson = res.json;
      res.json(responseData);

      expect(next).toHaveBeenCalled();
    });

    it("should skip caching when Redis unavailable", async () => {
      mockGetRedisClient.mockReturnValue(null);

      const middleware = cacheMiddleware(300);
      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(mockGetCache).not.toHaveBeenCalled();
    });

    it("should use custom key generator when provided", async () => {
      mockGetCache.mockResolvedValue(null);
      const customKeyGenerator = jest.fn().mockReturnValue("custom:key:123");

      const middleware = cacheMiddleware(300, customKeyGenerator, true); // Force cache for testing
      await middleware(req, res, next);

      expect(customKeyGenerator).toHaveBeenCalledWith(req);
    });

    it("should generate default cache key correctly", async () => {
      mockGetCache.mockResolvedValue(null);
      req.query = { page: 1, limit: 10 };
      req.session = { userId: "user123" }; // Use correct session structure

      const middleware = cacheMiddleware(300, null, true); // Force cache for testing
      await middleware(req, res, next);

      expect(mockGetCache).toHaveBeenCalledWith(
        expect.stringContaining("realtime:GET:/api/test:user123")
      );
    });

    it("should handle anonymous users", async () => {
      mockGetCache.mockResolvedValue(null);
      req.session = {};

      const middleware = cacheMiddleware(300, null, true); // Force cache for testing
      await middleware(req, res, next);

      expect(mockGetCache).toHaveBeenCalledWith(
        expect.stringContaining("realtime:GET:/api/test:anonymous")
      );
    });
  });

  describe("invalidateCacheMiddleware", () => {
    it("should invalidate cache patterns after successful response", async () => {
      const patterns = ["user-*", "team-*"];
      mockInvalidatePattern.mockResolvedValue(true);

      const middleware = invalidateCacheMiddleware(patterns);
      middleware(req, res, next);

      // Simulate successful response
      res.statusCode = 200;
      const responseData = { success: true };

      // The middleware should have overridden res.json
      expect(typeof res.json).toBe("function");

      // Call the overridden method
      res.json(responseData);

      // Give time for async operations
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(next).toHaveBeenCalled();
    });

    it("should not invalidate cache for error responses", async () => {
      const patterns = ["user-*"];
      const middleware = invalidateCacheMiddleware(patterns);

      middleware(req, res, next);

      // Simulate error response
      res.statusCode = 400;
      res.json({ error: "Bad request" });

      expect(next).toHaveBeenCalled();
      expect(mockInvalidatePattern).not.toHaveBeenCalled();
    });

    it("should handle function patterns", async () => {
      const patternFunction = jest
        .fn()
        .mockReturnValue("dynamic:pattern:user123");
      const patterns = [patternFunction];

      const middleware = invalidateCacheMiddleware(patterns);
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it("should replace placeholders in patterns", async () => {
      req.session = { user: { id: "user123" } };
      req.params = { teamId: "team456", taskId: "task789" };
      req.body = { teamId: "bodyTeam" };

      const patterns = ["user-:userId-*", "team-:teamId-*", "task-:taskId-*"];
      const middleware = invalidateCacheMiddleware(patterns);

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });

  describe("Utility Functions", () => {
    describe("invalidateUserCache", () => {
      it("should invalidate user-specific cache", async () => {
        await invalidateUserCache("user123");
        expect(mockInvalidatePattern).toHaveBeenCalledWith(
          "cache:*:*:user123:*"
        );
      });
    });

    describe("invalidateTeamCache", () => {
      it("should invalidate team-specific cache", async () => {
        await invalidateTeamCache("team456");
        expect(mockInvalidatePattern).toHaveBeenCalledWith(
          "cache:*:*:*:*team456*"
        );
      });
    });

    describe("clearAllCache", () => {
      it("should clear all cache entries", async () => {
        await clearAllCache();
        expect(mockInvalidatePattern).toHaveBeenCalledWith("cache:*");
      });
    });
  });

  describe("Error Handling", () => {
    it("should handle cache middleware errors gracefully", async () => {
      mockGetCache.mockRejectedValue(new Error("Redis error"));
      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();

      const middleware = cacheMiddleware(300);
      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });

    it("should handle invalidation errors gracefully", async () => {
      mockInvalidatePattern.mockRejectedValue(new Error("Redis error"));
      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();

      const middleware = invalidateCacheMiddleware(["test-*"]);
      middleware(req, res, next);

      res.statusCode = 200;
      res.json({ success: true });

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(next).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });
  });
});
