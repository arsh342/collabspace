/**
 * Cache Management Utility
 *
 * Provides utilities for managing and monitoring the browser cache system
 */

class CacheManager {
  constructor() {
    this.initializeDebugConsole();
  }

  initializeDebugConsole() {
    // Add cache debugging to window object for console access
    window.cacheDebug = {
      stats: () => this.getCacheStats(),
      clear: (category) => this.clearCache(category),
      export: () => this.exportCache(),
      import: (data) => this.importCache(data),
      monitor: () => this.startMonitoring(),
      test: () => this.runTests(),
    };
  }

  async getCacheStats() {
    if (!window.collabCache || !window.browserCache) {
      console.log("❌ Cache system not available");
      return null;
    }

    const stats = await window.collabCache.getStats();

    console.group("📊 CollabSpace Cache Statistics");
    console.log("Storage Availability:", {
      localStorage: stats.localStorage.available,
      sessionStorage: stats.sessionStorage.available,
      indexedDB: stats.indexedDB.available,
    });

    console.log("Storage Usage:", {
      localStorage: `${(stats.localStorage.usage / 1024).toFixed(2)} KB (${
        stats.localStorage.items
      } items)`,
      sessionStorage: `${(stats.sessionStorage.usage / 1024).toFixed(2)} KB (${
        stats.sessionStorage.items
      } items)`,
      indexedDB: `${stats.indexedDB.items} items`,
    });

    console.log("Category Breakdown:", stats.categories);
    console.log("Total Keys:", stats.totalKeys);
    console.groupEnd();

    return stats;
  }

  async clearCache(category = null) {
    if (!window.collabCache) {
      console.log("❌ Cache system not available");
      return false;
    }

    if (category) {
      await window.collabCache.invalidateCategory(category);
      console.log(`✅ Cleared ${category} cache`);
    } else {
      await window.collabCache.invalidate("all");
      console.log("✅ Cleared all cache");
    }

    return true;
  }

  async exportCache() {
    if (!window.collabCache) {
      console.log("❌ Cache system not available");
      return null;
    }

    try {
      const exportData = await window.collabCache.exportCacheData();

      // Create downloadable file
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: "application/json",
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `collabspace-cache-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      console.log("✅ Cache exported successfully");
      return exportData;
    } catch (error) {
      console.error("❌ Export failed:", error);
      return null;
    }
  }

  async importCache(data) {
    if (!window.collabCache) {
      console.log("❌ Cache system not available");
      return false;
    }

    try {
      await window.collabCache.importCacheData(data);
      console.log("✅ Cache imported successfully");
      return true;
    } catch (error) {
      console.error("❌ Import failed:", error);
      return false;
    }
  }

  startMonitoring() {
    console.log("🔍 Starting cache monitoring...");

    const monitor = setInterval(async () => {
      const stats = await window.collabCache?.getStats();
      if (stats) {
        console.log(
          `📊 Cache Monitor - Total: ${stats.totalKeys} keys, localStorage: ${(
            stats.localStorage.usage / 1024
          ).toFixed(2)}KB`
        );
      }
    }, 30000); // Every 30 seconds

    // Stop monitoring after 5 minutes
    setTimeout(() => {
      clearInterval(monitor);
      console.log("⏹️ Cache monitoring stopped");
    }, 5 * 60 * 1000);

    return monitor;
  }

  async runTests() {
    console.group("🧪 Running Cache System Tests");

    if (!window.browserCache) {
      console.log("❌ Cache system not available");
      console.groupEnd();
      return;
    }

    try {
      // Test 1: Basic set/get
      console.log("Test 1: Basic set/get operations...");
      await window.browserCache.set("test_key", { message: "Hello Cache!" });
      const testValue = await window.browserCache.get("test_key");
      console.log(
        testValue?.message === "Hello Cache!"
          ? "✅ Basic set/get"
          : "❌ Basic set/get failed"
      );

      // Test 2: TTL expiration
      console.log("Test 2: TTL expiration...");
      await window.browserCache.set("ttl_test", "This will expire", {
        ttl: 1000,
      }); // 1 second
      setTimeout(async () => {
        const expiredValue = await window.browserCache.get("ttl_test");
        console.log(
          expiredValue === null
            ? "✅ TTL expiration"
            : "❌ TTL expiration failed"
        );
      }, 1500);

      // Test 3: Category management
      console.log("Test 3: Category management...");
      await window.browserCache.set("cat_test1", "data1", {
        category: "test_category",
      });
      await window.browserCache.set("cat_test2", "data2", {
        category: "test_category",
      });
      await window.browserCache.clearByCategory("test_category");
      const catTest1 = await window.browserCache.get("cat_test1");
      const catTest2 = await window.browserCache.get("cat_test2");
      console.log(
        catTest1 === null && catTest2 === null
          ? "✅ Category management"
          : "❌ Category management failed"
      );

      // Test 4: Large data handling
      console.log("Test 4: Large data handling...");
      const largeData = {
        data: "x".repeat(100000), // 100KB string
        timestamp: Date.now(),
        metadata: { size: "large", test: true },
      };
      await window.browserCache.set("large_test", largeData, {
        forceIndexedDB: true,
      });
      const retrievedLargeData = await window.browserCache.get("large_test");
      console.log(
        retrievedLargeData?.data.length === 100000
          ? "✅ Large data handling"
          : "❌ Large data handling failed"
      );

      // Test 5: CollabSpace integration
      console.log("Test 5: CollabSpace integration...");
      if (window.collabCache) {
        const testUser = {
          _id: "test_user_123",
          username: "testuser",
          email: "test@example.com",
          firstName: "Test",
          lastName: "User",
        };

        await window.collabCache.cacheUser(testUser);
        const cachedUser = await window.collabCache.getUser();
        console.log(
          cachedUser?.username === "testuser"
            ? "✅ CollabSpace integration"
            : "❌ CollabSpace integration failed"
        );

        // Clean up test user
        await window.collabCache.invalidate("user");
      } else {
        console.log("⚠️ CollabSpace cache adapter not available");
      }

      console.log("🏁 Cache tests completed");
    } catch (error) {
      console.error("❌ Test suite failed:", error);
    }

    console.groupEnd();
  }

  // Performance testing
  async performanceTest() {
    console.group("⚡ Cache Performance Test");

    if (!window.browserCache) {
      console.log("❌ Cache system not available");
      console.groupEnd();
      return;
    }

    const iterations = 1000;
    const testData = {
      test: true,
      timestamp: Date.now(),
      data: "x".repeat(1000),
    };

    // Test localStorage performance
    console.time("localStorage writes");
    for (let i = 0; i < iterations; i++) {
      await window.browserCache.set(`perf_ls_${i}`, testData, {
        persistent: true,
      });
    }
    console.timeEnd("localStorage writes");

    console.time("localStorage reads");
    for (let i = 0; i < iterations; i++) {
      await window.browserCache.get(`perf_ls_${i}`);
    }
    console.timeEnd("localStorage reads");

    // Test sessionStorage performance
    console.time("sessionStorage writes");
    for (let i = 0; i < iterations; i++) {
      await window.browserCache.set(`perf_ss_${i}`, testData, {
        persistent: false,
      });
    }
    console.timeEnd("sessionStorage writes");

    console.time("sessionStorage reads");
    for (let i = 0; i < iterations; i++) {
      await window.browserCache.get(`perf_ss_${i}`);
    }
    console.timeEnd("sessionStorage reads");

    // Clean up performance test data
    for (let i = 0; i < iterations; i++) {
      await window.browserCache.remove(`perf_ls_${i}`);
      await window.browserCache.remove(`perf_ss_${i}`);
    }

    console.log("🏁 Performance test completed");
    console.groupEnd();
  }

  // Cache health check
  async healthCheck() {
    console.group("🏥 Cache Health Check");

    const health = {
      browserCache: !!window.browserCache,
      collabCache: !!window.collabCache,
      localStorage: false,
      sessionStorage: false,
      indexedDB: false,
      errors: [],
    };

    try {
      // Test localStorage
      localStorage.setItem("health_test", "test");
      localStorage.removeItem("health_test");
      health.localStorage = true;
    } catch (error) {
      health.errors.push(`localStorage: ${error.message}`);
    }

    try {
      // Test sessionStorage
      sessionStorage.setItem("health_test", "test");
      sessionStorage.removeItem("health_test");
      health.sessionStorage = true;
    } catch (error) {
      health.errors.push(`sessionStorage: ${error.message}`);
    }

    try {
      // Test IndexedDB
      if (window.indexedDB) {
        health.indexedDB = true;
      }
    } catch (error) {
      health.errors.push(`indexedDB: ${error.message}`);
    }

    console.log("Health Status:", health);

    if (health.errors.length === 0) {
      console.log("✅ All cache systems healthy");
    } else {
      console.log("⚠️ Issues detected:", health.errors);
    }

    console.groupEnd();
    return health;
  }
}

// Initialize cache manager
window.cacheManager = new CacheManager();

// Add global shortcut functions
window.cacheStats = () => window.cacheDebug.stats();
window.cacheClear = (category) => window.cacheDebug.clear(category);
window.cacheTest = () => window.cacheDebug.test();

console.log(`
🗄️ CollabSpace Cache Management Console Ready!

Available commands:
- cacheStats()           : Show cache statistics
- cacheClear([category]) : Clear cache (all or by category)
- cacheTest()           : Run cache system tests
- cacheDebug.export()   : Export cache data
- cacheDebug.monitor()  : Start cache monitoring
- cacheManager.performanceTest() : Run performance tests
- cacheManager.healthCheck()     : Check cache system health

Examples:
  cacheStats()                    // Show all cache stats
  cacheClear('user')              // Clear user cache
  cacheClear()                    // Clear all cache
  cacheTest()                     // Test cache functionality
`);

console.log("🎛️ Cache Management Utility loaded");
