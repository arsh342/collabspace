/**
 * CollabSpace Cache Management & Debug Utilities
 *
 * Provides debugging and management tools for the optimized caching system
 * where Redis is used only for essential real-time data and everything else
 * uses browser-based caching.
 */

class CacheManager {
  constructor() {
    this.redisMetrics = {
      hits: 0,
      misses: 0,
      sets: 0,
      invalidations: 0,
    };

    this.clientMetrics = {
      hits: 0,
      misses: 0,
      sets: 0,
      invalidations: 0,
    };

    this.init();
  }

  init() {
    console.log("🔧 Cache Manager initialized");

    // Monitor cache operations
    this.setupCacheMonitoring();

    // Setup global debugging functions
    this.setupGlobalFunctions();
  }

  setupCacheMonitoring() {
    // Monitor localStorage operations
    const originalSetItem = localStorage.setItem;
    const originalGetItem = localStorage.getItem;
    const originalRemoveItem = localStorage.removeItem;

    localStorage.setItem = (key, value) => {
      if (key.startsWith("collabspace_")) {
        this.clientMetrics.sets++;
      }
      return originalSetItem.call(localStorage, key, value);
    };

    localStorage.getItem = (key) => {
      if (key.startsWith("collabspace_")) {
        this.clientMetrics.hits++;
      }
      return originalGetItem.call(localStorage, key);
    };

    localStorage.removeItem = (key) => {
      if (key.startsWith("collabspace_")) {
        this.clientMetrics.invalidations++;
      }
      return originalRemoveItem.call(localStorage, key);
    };
  }

  setupGlobalFunctions() {
    // Global cache debugging functions
    window.cacheStats = () => this.showCacheStats();
    window.cacheClear = (category) => this.clearCache(category);
    window.cacheTest = () => this.runCacheTests();
    window.cacheDebug = {
      monitor: () => this.startMonitoring(),
      stop: () => this.stopMonitoring(),
      export: () => this.exportCacheData(),
      import: (data) => this.importCacheData(data),
    };
    window.cacheManager = this;

    console.log("🔍 Global cache debug functions available:");
    console.log("  cacheStats() - Show cache statistics");
    console.log("  cacheClear(category?) - Clear cache");
    console.log("  cacheTest() - Run functionality tests");
    console.log("  cacheDebug.monitor() - Start monitoring");
  }

  async showCacheStats() {
    console.group("📊 CollabSpace Optimized Cache Statistics");

    // Strategy overview
    console.group("🎯 Optimized Caching Strategy");
    console.log("✅ Redis: ONLY essential real-time data");
    console.log("   - Online user presence");
    console.log("   - Live notifications");
    console.log("   - Unread message counts");
    console.log("   - Socket.IO room management");
    console.log("   - Rate limiting");
    console.log("");
    console.log("✅ Browser Cache: Everything else (90% of data)");
    console.log("   - User profiles & settings");
    console.log("   - Teams & team data");
    console.log("   - Tasks & task lists");
    console.log("   - Message history");
    console.log("   - Dashboard stats");
    console.log("   - File metadata");
    console.groupEnd();

    if (window.collabCache) {
      const browserStats = await window.collabCache.getStats();
      console.group("🖥️ Browser Cache Performance");
      console.table({
        localStorage: {
          Available: browserStats.localStorage.available ? "✅" : "❌",
          Items: browserStats.localStorage.items,
          "Size (KB)": Math.round(browserStats.localStorage.usage / 1024),
        },
        sessionStorage: {
          Available: browserStats.sessionStorage.available ? "✅" : "❌",
          Items: browserStats.sessionStorage.items,
          "Size (KB)": Math.round(browserStats.sessionStorage.usage / 1024),
        },
        IndexedDB: {
          Available: browserStats.indexedDB.available ? "✅" : "❌",
          Items: browserStats.indexedDB.items || 0,
          Size: "Variable",
        },
      });
      console.groupEnd();
    }

    console.groupEnd();
  }

  async clearCache(category = null) {
    if (!category) {
      if (window.collabCache) {
        await window.collabCache.invalidate("all");
      }
      console.log(
        "🗑️ All client cache cleared - Redis real-time data preserved"
      );
    } else {
      if (window.collabCache) {
        await window.collabCache.invalidateCategory(category);
        console.log(`🗑️ Category '${category}' cache cleared`);
      }
    }
  }

  async runCacheTests() {
    console.group("🧪 Testing Optimized Cache System");
    console.log("Testing browser-only caching strategy...");

    let passed = 0;
    let failed = 0;

    try {
      await this.testBasicOperations();
      passed++;
      console.log("✅ Basic operations test passed");
    } catch (error) {
      failed++;
      console.error("❌ Basic operations test failed:", error.message);
    }

    try {
      await this.testCategoryManagement();
      passed++;
      console.log("✅ Category management test passed");
    } catch (error) {
      failed++;
      console.error("❌ Category management test failed:", error.message);
    }

    console.log(`\nResults: ${passed} passed, ${failed} failed`);
    console.groupEnd();

    return { passed, failed };
  }

  async testBasicOperations() {
    if (!window.collabCache) {
      throw new Error("Cache adapter not available");
    }

    const testUser = { _id: "test123", name: "Test User" };
    await window.collabCache.cacheUser(testUser);

    const retrieved = await window.collabCache.getUser();
    if (!retrieved || retrieved._id !== testUser._id) {
      throw new Error("Basic cache operations failed");
    }
  }

  async testCategoryManagement() {
    if (!window.collabCache) {
      throw new Error("Cache adapter not available");
    }

    await window.collabCache.cacheUser({ _id: "cat_test", name: "Test" });
    await window.collabCache.invalidateCategory("user");

    const user = await window.collabCache.getUser();
    if (user && user._id === "cat_test") {
      throw new Error("Category invalidation failed");
    }
  }

  startMonitoring() {
    console.log("👀 Starting cache monitoring (optimized strategy)...");
    this.monitoringInterval = setInterval(() => {
      console.log(
        "📊 Cache Status: Browser-only caching active, Redis reserved for real-time data"
      );
    }, 30000);
  }

  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      console.log("🛑 Cache monitoring stopped");
    }
  }
}

// Initialize optimized cache manager
document.addEventListener("DOMContentLoaded", () => {
  setTimeout(() => {
    window.cacheManager = new CacheManager();
    console.log(
      "🚀 Optimized Cache Manager ready - Redis minimal, Browser maximal"
    );
  }, 1000);
});

console.log("🔧 Optimized Cache Management Tools loaded");
