/**
 * CollabSpace Browser Cache Manager
 *
 * Implements a comprehensive browser caching system with:
 * - Primary: localStorage with TTL support
 * - Fallback: sessionStorage
 * - Advanced: IndexedDB for large data
 * - Features: Cache invalidation, automatic cleanup, data versioning
 */

class BrowserCacheManager {
  constructor(options = {}) {
    this.prefix = options.prefix || "collabspace_";
    this.version = options.version || "1.0.0";
    this.maxLocalStorageSize = options.maxLocalStorageSize || 5 * 1024 * 1024; // 5MB
    this.defaultTTL = options.defaultTTL || 24 * 60 * 60 * 1000; // 24 hours
    this.cleanupInterval = options.cleanupInterval || 60 * 60 * 1000; // 1 hour

    // Storage availability flags
    this.hasLocalStorage = this.isLocalStorageAvailable();
    this.hasSessionStorage = this.isSessionStorageAvailable();
    this.hasIndexedDB = this.isIndexedDBAvailable();

    // Initialize IndexedDB if available
    this.db = null;
    this.dbName = `${this.prefix}cache_db`;
    this.dbVersion = 1;

    this.init();
  }

  async init() {
    console.log("🗄️ Initializing Browser Cache Manager...");

    // Initialize IndexedDB
    if (this.hasIndexedDB) {
      try {
        await this.initIndexedDB();
        console.log("✅ IndexedDB initialized");
      } catch (error) {
        console.warn("⚠️ IndexedDB initialization failed:", error);
        this.hasIndexedDB = false;
      }
    }

    // Setup automatic cleanup
    this.setupCleanup();

    // Version check and migration
    this.checkVersion();

    console.log("✅ Browser Cache Manager ready");
    console.log(
      `📊 Storage availability: localStorage: ${this.hasLocalStorage}, sessionStorage: ${this.hasSessionStorage}, IndexedDB: ${this.hasIndexedDB}`
    );
  }

  // Storage availability checks
  isLocalStorageAvailable() {
    try {
      const test = "__test__";
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch (e) {
      return false;
    }
  }

  isSessionStorageAvailable() {
    try {
      const test = "__test__";
      sessionStorage.setItem(test, test);
      sessionStorage.removeItem(test);
      return true;
    } catch (e) {
      return false;
    }
  }

  isIndexedDBAvailable() {
    return "indexedDB" in window && window.indexedDB !== null;
  }

  // IndexedDB initialization
  async initIndexedDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Create object store for cache data
        if (!db.objectStoreNames.contains("cache")) {
          const cacheStore = db.createObjectStore("cache", { keyPath: "key" });
          cacheStore.createIndex("expiry", "expiry", { unique: false });
          cacheStore.createIndex("category", "category", { unique: false });
        }

        // Create object store for large files/blobs
        if (!db.objectStoreNames.contains("files")) {
          const fileStore = db.createObjectStore("files", { keyPath: "key" });
          fileStore.createIndex("type", "type", { unique: false });
        }
      };
    });
  }

  // Core cache methods

  /**
   * Set cache item with automatic storage selection
   * @param {string} key - Cache key
   * @param {*} value - Data to cache
   * @param {Object} options - Options object
   * @param {number} options.ttl - Time to live in milliseconds
   * @param {string} options.category - Data category for easier management
   * @param {boolean} options.persistent - Use localStorage instead of sessionStorage
   * @param {boolean} options.forceIndexedDB - Force use of IndexedDB for large data
   */
  async set(key, value, options = {}) {
    const {
      ttl = this.defaultTTL,
      category = "general",
      persistent = true,
      forceIndexedDB = false,
    } = options;

    const fullKey = this.prefix + key;
    const expiry = Date.now() + ttl;
    const cacheItem = {
      key: fullKey,
      value,
      expiry,
      category,
      version: this.version,
      timestamp: Date.now(),
    };

    const serializedData = JSON.stringify(cacheItem);
    const dataSize = new Blob([serializedData]).size;

    try {
      // Determine storage method based on size and availability
      if (forceIndexedDB || dataSize > 1024 * 1024) {
        // > 1MB
        return await this.setIndexedDB(fullKey, cacheItem);
      } else if (persistent && this.hasLocalStorage) {
        return this.setLocalStorage(fullKey, cacheItem);
      } else if (this.hasSessionStorage) {
        return this.setSessionStorage(fullKey, cacheItem);
      } else if (this.hasIndexedDB) {
        return await this.setIndexedDB(fullKey, cacheItem);
      }

      throw new Error("No storage method available");
    } catch (error) {
      console.error("Cache set error:", error);
      return false;
    }
  }

  /**
   * Get cache item from any available storage
   * @param {string} key - Cache key
   * @param {*} defaultValue - Default value if not found
   */
  async get(key, defaultValue = null) {
    const fullKey = this.prefix + key;

    try {
      // Try localStorage first (most common)
      if (this.hasLocalStorage) {
        const result = this.getLocalStorage(fullKey);
        if (result !== null) return result;
      }

      // Try sessionStorage
      if (this.hasSessionStorage) {
        const result = this.getSessionStorage(fullKey);
        if (result !== null) return result;
      }

      // Try IndexedDB
      if (this.hasIndexedDB) {
        const result = await this.getIndexedDB(fullKey);
        if (result !== null) return result;
      }

      return defaultValue;
    } catch (error) {
      console.error("Cache get error:", error);
      return defaultValue;
    }
  }

  /**
   * Remove cache item from all storages
   * @param {string} key - Cache key
   */
  async remove(key) {
    const fullKey = this.prefix + key;

    try {
      // Remove from all storages
      if (this.hasLocalStorage) {
        localStorage.removeItem(fullKey);
      }

      if (this.hasSessionStorage) {
        sessionStorage.removeItem(fullKey);
      }

      if (this.hasIndexedDB) {
        await this.removeIndexedDB(fullKey);
      }

      return true;
    } catch (error) {
      console.error("Cache remove error:", error);
      return false;
    }
  }

  // LocalStorage methods
  setLocalStorage(key, cacheItem) {
    try {
      const serialized = JSON.stringify(cacheItem);

      // Check storage quota
      if (
        this.getStorageSize() + serialized.length >
        this.maxLocalStorageSize
      ) {
        this.cleanupExpired("localStorage");

        // If still not enough space, remove oldest items
        if (
          this.getStorageSize() + serialized.length >
          this.maxLocalStorageSize
        ) {
          this.cleanupOldest("localStorage", serialized.length);
        }
      }

      localStorage.setItem(key, serialized);
      return true;
    } catch (error) {
      console.error("LocalStorage set error:", error);
      return false;
    }
  }

  getLocalStorage(key) {
    try {
      const item = localStorage.getItem(key);
      if (!item) return null;

      const cacheItem = JSON.parse(item);

      // Check expiry
      if (cacheItem.expiry && Date.now() > cacheItem.expiry) {
        localStorage.removeItem(key);
        return null;
      }

      // Check version compatibility
      if (cacheItem.version && cacheItem.version !== this.version) {
        localStorage.removeItem(key);
        return null;
      }

      return cacheItem.value;
    } catch (error) {
      console.error("LocalStorage get error:", error);
      localStorage.removeItem(key);
      return null;
    }
  }

  // SessionStorage methods
  setSessionStorage(key, cacheItem) {
    try {
      sessionStorage.setItem(key, JSON.stringify(cacheItem));
      return true;
    } catch (error) {
      console.error("SessionStorage set error:", error);
      return false;
    }
  }

  getSessionStorage(key) {
    try {
      const item = sessionStorage.getItem(key);
      if (!item) return null;

      const cacheItem = JSON.parse(item);

      // Check expiry
      if (cacheItem.expiry && Date.now() > cacheItem.expiry) {
        sessionStorage.removeItem(key);
        return null;
      }

      return cacheItem.value;
    } catch (error) {
      console.error("SessionStorage get error:", error);
      sessionStorage.removeItem(key);
      return null;
    }
  }

  // IndexedDB methods
  async setIndexedDB(key, cacheItem) {
    if (!this.db) return false;

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(["cache"], "readwrite");
      const store = transaction.objectStore("cache");

      const request = store.put(cacheItem);

      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  }

  async getIndexedDB(key) {
    if (!this.db) return null;

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(["cache"], "readonly");
      const store = transaction.objectStore("cache");

      const request = store.get(key);

      request.onsuccess = () => {
        const result = request.result;
        if (!result) {
          resolve(null);
          return;
        }

        // Check expiry
        if (result.expiry && Date.now() > result.expiry) {
          this.removeIndexedDB(key);
          resolve(null);
          return;
        }

        resolve(result.value);
      };

      request.onerror = () => reject(request.error);
    });
  }

  async removeIndexedDB(key) {
    if (!this.db) return false;

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(["cache"], "readwrite");
      const store = transaction.objectStore("cache");

      const request = store.delete(key);

      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  }

  // Cache management methods

  /**
   * Clear all cache data from all storages
   * @param {string} category - Optional category to clear
   */
  async clearAll(category = null) {
    try {
      if (category) {
        await this.clearByCategory(category);
      } else {
        // Clear localStorage
        if (this.hasLocalStorage) {
          const keys = Object.keys(localStorage).filter((key) =>
            key.startsWith(this.prefix)
          );
          keys.forEach((key) => localStorage.removeItem(key));
        }

        // Clear sessionStorage
        if (this.hasSessionStorage) {
          const keys = Object.keys(sessionStorage).filter((key) =>
            key.startsWith(this.prefix)
          );
          keys.forEach((key) => sessionStorage.removeItem(key));
        }

        // Clear IndexedDB
        if (this.hasIndexedDB && this.db) {
          const transaction = this.db.transaction(["cache"], "readwrite");
          const store = transaction.objectStore("cache");
          await new Promise((resolve) => {
            const request = store.clear();
            request.onsuccess = () => resolve();
          });
        }
      }

      console.log("✅ Cache cleared successfully");
      return true;
    } catch (error) {
      console.error("Cache clear error:", error);
      return false;
    }
  }

  /**
   * Clear cache by category
   * @param {string} category - Category to clear
   */
  async clearByCategory(category) {
    // Clear from localStorage
    if (this.hasLocalStorage) {
      const keys = Object.keys(localStorage).filter((key) => {
        if (!key.startsWith(this.prefix)) return false;
        try {
          const item = JSON.parse(localStorage.getItem(key));
          return item.category === category;
        } catch {
          return false;
        }
      });
      keys.forEach((key) => localStorage.removeItem(key));
    }

    // Clear from sessionStorage
    if (this.hasSessionStorage) {
      const keys = Object.keys(sessionStorage).filter((key) => {
        if (!key.startsWith(this.prefix)) return false;
        try {
          const item = JSON.parse(sessionStorage.getItem(key));
          return item.category === category;
        } catch {
          return false;
        }
      });
      keys.forEach((key) => sessionStorage.removeItem(key));
    }

    // Clear from IndexedDB
    if (this.hasIndexedDB && this.db) {
      const transaction = this.db.transaction(["cache"], "readwrite");
      const store = transaction.objectStore("cache");
      const index = store.index("category");

      return new Promise((resolve) => {
        const request = index.openCursor(IDBKeyRange.only(category));
        request.onsuccess = (event) => {
          const cursor = event.target.result;
          if (cursor) {
            cursor.delete();
            cursor.continue();
          } else {
            resolve();
          }
        };
      });
    }
  }

  /**
   * Clean up expired cache items
   * @param {string} storageType - Specific storage to clean (optional)
   */
  cleanupExpired(storageType = null) {
    const now = Date.now();

    // Clean localStorage
    if (
      (!storageType || storageType === "localStorage") &&
      this.hasLocalStorage
    ) {
      const keys = Object.keys(localStorage).filter((key) =>
        key.startsWith(this.prefix)
      );
      keys.forEach((key) => {
        try {
          const item = JSON.parse(localStorage.getItem(key));
          if (item.expiry && now > item.expiry) {
            localStorage.removeItem(key);
          }
        } catch {
          localStorage.removeItem(key);
        }
      });
    }

    // Clean sessionStorage
    if (
      (!storageType || storageType === "sessionStorage") &&
      this.hasSessionStorage
    ) {
      const keys = Object.keys(sessionStorage).filter((key) =>
        key.startsWith(this.prefix)
      );
      keys.forEach((key) => {
        try {
          const item = JSON.parse(sessionStorage.getItem(key));
          if (item.expiry && now > item.expiry) {
            sessionStorage.removeItem(key);
          }
        } catch {
          sessionStorage.removeItem(key);
        }
      });
    }

    // Clean IndexedDB (async)
    if (
      (!storageType || storageType === "indexedDB") &&
      this.hasIndexedDB &&
      this.db
    ) {
      this.cleanupIndexedDBExpired();
    }
  }

  async cleanupIndexedDBExpired() {
    if (!this.db) return;

    const transaction = this.db.transaction(["cache"], "readwrite");
    const store = transaction.objectStore("cache");
    const index = store.index("expiry");

    const now = Date.now();
    const request = index.openCursor(IDBKeyRange.upperBound(now));

    request.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      }
    };
  }

  /**
   * Clean up oldest items to free space
   * @param {string} storageType - Storage type to clean
   * @param {number} spaceNeeded - Space needed in bytes
   */
  cleanupOldest(storageType, spaceNeeded) {
    if (storageType === "localStorage" && this.hasLocalStorage) {
      const items = [];
      const keys = Object.keys(localStorage).filter((key) =>
        key.startsWith(this.prefix)
      );

      keys.forEach((key) => {
        try {
          const item = JSON.parse(localStorage.getItem(key));
          items.push({
            key,
            timestamp: item.timestamp || 0,
            size: localStorage.getItem(key).length,
          });
        } catch {
          localStorage.removeItem(key);
        }
      });

      // Sort by timestamp (oldest first)
      items.sort((a, b) => a.timestamp - b.timestamp);

      let freedSpace = 0;
      for (const item of items) {
        if (freedSpace >= spaceNeeded) break;
        localStorage.removeItem(item.key);
        freedSpace += item.size;
      }
    }
  }

  /**
   * Get storage usage statistics
   */
  getStorageStats() {
    const stats = {
      localStorage: { available: this.hasLocalStorage, usage: 0, items: 0 },
      sessionStorage: { available: this.hasSessionStorage, usage: 0, items: 0 },
      indexedDB: { available: this.hasIndexedDB, usage: 0, items: 0 },
    };

    // Calculate localStorage usage
    if (this.hasLocalStorage) {
      const keys = Object.keys(localStorage).filter((key) =>
        key.startsWith(this.prefix)
      );
      keys.forEach((key) => {
        const item = localStorage.getItem(key);
        if (item) {
          stats.localStorage.usage += item.length;
          stats.localStorage.items++;
        }
      });
    }

    // Calculate sessionStorage usage
    if (this.hasSessionStorage) {
      const keys = Object.keys(sessionStorage).filter((key) =>
        key.startsWith(this.prefix)
      );
      keys.forEach((key) => {
        const item = sessionStorage.getItem(key);
        if (item) {
          stats.sessionStorage.usage += item.length;
          stats.sessionStorage.items++;
        }
      });
    }

    return stats;
  }

  getStorageSize() {
    let totalSize = 0;
    if (this.hasLocalStorage) {
      const keys = Object.keys(localStorage).filter((key) =>
        key.startsWith(this.prefix)
      );
      keys.forEach((key) => {
        const item = localStorage.getItem(key);
        if (item) totalSize += item.length;
      });
    }
    return totalSize;
  }

  /**
   * Setup automatic cleanup interval
   */
  setupCleanup() {
    setInterval(() => {
      console.log("🧹 Running cache cleanup...");
      this.cleanupExpired();
    }, this.cleanupInterval);
  }

  /**
   * Check and handle version changes
   */
  checkVersion() {
    const versionKey = this.prefix + "version";
    const storedVersion = localStorage.getItem(versionKey);

    if (storedVersion && storedVersion !== this.version) {
      console.log(
        `📱 Version change detected: ${storedVersion} → ${this.version}`
      );
      console.log("🧹 Clearing cache due to version change...");
      this.clearAll();
    }

    if (this.hasLocalStorage) {
      localStorage.setItem(versionKey, this.version);
    }
  }

  /**
   * Handle storage quota exceeded errors
   */
  handleQuotaExceeded(error, key, value, options) {
    console.warn("💾 Storage quota exceeded, attempting cleanup...", error);

    // Try cleanup and retry
    this.cleanupExpired();

    try {
      return this.set(key, value, { ...options, forceIndexedDB: true });
    } catch (retryError) {
      console.error("❌ Failed to store after cleanup:", retryError);
      return false;
    }
  }

  /**
   * Utility method to check if a key exists in cache
   * @param {string} key - Cache key to check
   */
  async has(key) {
    const value = await this.get(key, Symbol("not-found"));
    return value !== Symbol.for("not-found");
  }

  /**
   * Get cache keys by pattern
   * @param {string} pattern - Pattern to match (simple string includes)
   */
  async getKeys(pattern = "") {
    const keys = new Set();

    // Get from localStorage
    if (this.hasLocalStorage) {
      Object.keys(localStorage)
        .filter((key) => key.startsWith(this.prefix) && key.includes(pattern))
        .forEach((key) => keys.add(key.replace(this.prefix, "")));
    }

    // Get from sessionStorage
    if (this.hasSessionStorage) {
      Object.keys(sessionStorage)
        .filter((key) => key.startsWith(this.prefix) && key.includes(pattern))
        .forEach((key) => keys.add(key.replace(this.prefix, "")));
    }

    // Get from IndexedDB
    if (this.hasIndexedDB && this.db) {
      try {
        const transaction = this.db.transaction(["cache"], "readonly");
        const store = transaction.objectStore("cache");
        const request = store.getAllKeys();

        await new Promise((resolve) => {
          request.onsuccess = () => {
            request.result
              .filter(
                (key) => key.startsWith(this.prefix) && key.includes(pattern)
              )
              .forEach((key) => keys.add(key.replace(this.prefix, "")));
            resolve();
          };
        });
      } catch (error) {
        console.error("Error getting IndexedDB keys:", error);
      }
    }

    return Array.from(keys);
  }
}

// Export for use in other modules
window.BrowserCacheManager = BrowserCacheManager;

// Create global instance
window.browserCache = new BrowserCacheManager({
  prefix: "collabspace_",
  version: "1.0.0",
  maxLocalStorageSize: 5 * 1024 * 1024, // 5MB
  defaultTTL: 24 * 60 * 60 * 1000, // 24 hours
  cleanupInterval: 60 * 60 * 1000, // 1 hour
});

console.log("🗄️ CollabSpace Browser Cache Manager loaded");
