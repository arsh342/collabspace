/**
 * CollabSpace Cache Adapter
 *
 * Integrates the Browser Cache Manager with CollabSpace features:
 * - User data caching
 * - Team data caching
 * - Task data caching
 * - Message caching
 * - Dashboard stats caching
 * - File/image caching
 */

class CollabSpaceCacheAdapter {
  constructor(browserCache) {
    this.cache = browserCache;

    // Cache categories and TTL settings
    this.categories = {
      USER: "user",
      TEAM: "team",
      TASK: "task",
      MESSAGE: "message",
      DASHBOARD: "dashboard",
      FILE: "file",
      SETTINGS: "settings",
    };

    // Optimized TTL settings - everything uses browser storage now
    this.ttlSettings = {
      [this.categories.USER]: 2 * 60 * 60 * 1000, // 2 hours (reduced from 6)
      [this.categories.TEAM]: 30 * 60 * 1000, // 30 minutes (reduced from 2 hours)
      [this.categories.TASK]: 15 * 60 * 1000, // 15 minutes (reduced from 30)
      [this.categories.MESSAGE]: 5 * 60 * 1000, // 5 minutes (reduced from 15)
      [this.categories.DASHBOARD]: 2 * 60 * 1000, // 2 minutes (reduced from 5)
      [this.categories.FILE]: 6 * 60 * 60 * 1000, // 6 hours (reduced from 24)
      [this.categories.SETTINGS]: 12 * 60 * 60 * 1000, // 12 hours (reduced from 24)
    };

    // Redis is now ONLY used for real-time features in the server
    console.log(
      "📦 Cache Adapter: Using optimized browser-only caching strategy"
    );

    this.init();
  }

  init() {
    console.log("🚀 CollabSpace Cache Adapter initialized");

    // Setup cache invalidation listeners
    this.setupInvalidationListeners();
  }

  // ====================
  // USER DATA CACHING
  // ====================

  /**
   * Cache current user data
   * @param {Object} userData - User object
   */
  async cacheUser(userData) {
    if (!userData || !userData._id) return false;

    try {
      await this.cache.set(`user_${userData._id}`, userData, {
        category: this.categories.USER,
        ttl: this.ttlSettings[this.categories.USER],
        persistent: true,
      });

      // Also cache as current user for quick access
      await this.cache.set("current_user", userData, {
        category: this.categories.USER,
        ttl: this.ttlSettings[this.categories.USER],
        persistent: true,
      });

      return true;
    } catch (error) {
      console.error("Error caching user:", error);
      return false;
    }
  }

  /**
   * Get cached user data
   * @param {string} userId - User ID (optional, gets current user if not provided)
   */
  async getUser(userId = null) {
    try {
      if (userId) {
        return await this.cache.get(`user_${userId}`);
      }
      return await this.cache.get("current_user");
    } catch (error) {
      console.error("Error getting cached user:", error);
      return null;
    }
  }

  /**
   * Cache user profile with avatar
   * @param {string} userId - User ID
   * @param {Object} profileData - Profile data with avatar
   */
  async cacheUserProfile(userId, profileData) {
    return await this.cache.set(`user_profile_${userId}`, profileData, {
      category: this.categories.USER,
      ttl: this.ttlSettings[this.categories.USER],
      persistent: true,
    });
  }

  // ====================
  // TEAM DATA CACHING
  // ====================

  /**
   * Cache teams list
   * @param {Array} teams - Array of team objects
   */
  async cacheTeams(teams) {
    if (!Array.isArray(teams)) return false;

    try {
      // Cache the full teams list
      await this.cache.set("user_teams", teams, {
        category: this.categories.TEAM,
        ttl: this.ttlSettings[this.categories.TEAM],
        persistent: true,
      });

      // Cache individual teams for quick access
      for (const team of teams) {
        if (team._id) {
          await this.cache.set(`team_${team._id}`, team, {
            category: this.categories.TEAM,
            ttl: this.ttlSettings[this.categories.TEAM],
            persistent: true,
          });
        }
      }

      return true;
    } catch (error) {
      console.error("Error caching teams:", error);
      return false;
    }
  }

  /**
   * Get cached teams
   */
  async getTeams() {
    return await this.cache.get("user_teams", []);
  }

  /**
   * Get specific team
   * @param {string} teamId - Team ID
   */
  async getTeam(teamId) {
    return await this.cache.get(`team_${teamId}`);
  }

  /**
   * Cache team members
   * @param {string} teamId - Team ID
   * @param {Array} members - Team members array
   */
  async cacheTeamMembers(teamId, members) {
    return await this.cache.set(`team_members_${teamId}`, members, {
      category: this.categories.TEAM,
      ttl: this.ttlSettings[this.categories.TEAM],
      persistent: false, // Use sessionStorage for members data
    });
  }

  // ====================
  // TASK DATA CACHING
  // ====================

  /**
   * Cache tasks list
   * @param {Array} tasks - Array of task objects
   * @param {string} teamId - Optional team filter
   */
  async cacheTasks(tasks, teamId = null) {
    if (!Array.isArray(tasks)) return false;

    try {
      const key = teamId ? `tasks_team_${teamId}` : "user_tasks";

      await this.cache.set(key, tasks, {
        category: this.categories.TASK,
        ttl: this.ttlSettings[this.categories.TASK],
        persistent: false,
      });

      // Cache individual tasks
      for (const task of tasks) {
        if (task._id) {
          await this.cache.set(`task_${task._id}`, task, {
            category: this.categories.TASK,
            ttl: this.ttlSettings[this.categories.TASK],
            persistent: false,
          });
        }
      }

      return true;
    } catch (error) {
      console.error("Error caching tasks:", error);
      return false;
    }
  }

  /**
   * Get cached tasks
   * @param {string} teamId - Optional team filter
   */
  async getTasks(teamId = null) {
    const key = teamId ? `tasks_team_${teamId}` : "user_tasks";
    return await this.cache.get(key, []);
  }

  /**
   * Get specific task
   * @param {string} taskId - Task ID
   */
  async getTask(taskId) {
    return await this.cache.get(`task_${taskId}`);
  }

  /**
   * Update single task in cache
   * @param {Object} task - Updated task object
   */
  async updateTask(task) {
    if (!task || !task._id) return false;

    // Update individual task cache
    await this.cache.set(`task_${task._id}`, task, {
      category: this.categories.TASK,
      ttl: this.ttlSettings[this.categories.TASK],
      persistent: false,
    });

    // Update in tasks list if exists
    const tasks = await this.getTasks();
    const taskIndex = tasks.findIndex((t) => t._id === task._id);
    if (taskIndex !== -1) {
      tasks[taskIndex] = task;
      await this.cacheTasks(tasks);
    }

    return true;
  }

  // ====================
  // MESSAGE CACHING
  // ====================

  /**
   * Cache messages for a team
   * @param {string} teamId - Team ID
   * @param {Array} messages - Messages array
   */
  async cacheMessages(teamId, messages) {
    if (!teamId || !Array.isArray(messages)) return false;

    return await this.cache.set(`messages_${teamId}`, messages, {
      category: this.categories.MESSAGE,
      ttl: this.ttlSettings[this.categories.MESSAGE],
      persistent: false,
    });
  }

  /**
   * Get cached messages for a team
   * @param {string} teamId - Team ID
   */
  async getMessages(teamId) {
    return await this.cache.get(`messages_${teamId}`, []);
  }

  /**
   * Add new message to cache
   * @param {string} teamId - Team ID
   * @param {Object} message - Message object
   */
  async addMessage(teamId, message) {
    const messages = await this.getMessages(teamId);
    messages.push(message);

    // Keep only last 100 messages in cache
    if (messages.length > 100) {
      messages.splice(0, messages.length - 100);
    }

    return await this.cacheMessages(teamId, messages);
  }

  // ====================
  // DASHBOARD CACHING
  // ====================

  /**
   * Cache dashboard statistics
   * @param {Object} stats - Dashboard stats object
   * @param {string} userRole - User role (organiser/member)
   */
  async cacheDashboardStats(stats, userRole = "member") {
    return await this.cache.set(`dashboard_stats_${userRole}`, stats, {
      category: this.categories.DASHBOARD,
      ttl: this.ttlSettings[this.categories.DASHBOARD],
      persistent: false,
    });
  }

  /**
   * Get cached dashboard statistics
   * @param {string} userRole - User role (organiser/member)
   */
  async getDashboardStats(userRole = "member") {
    return await this.cache.get(`dashboard_stats_${userRole}`);
  }

  // ====================
  // FILE CACHING
  // ====================

  /**
   * Cache file data (for small files and metadata)
   * @param {string} fileId - File ID
   * @param {Object} fileData - File data/metadata
   * @param {boolean} isLarge - Whether to force IndexedDB storage
   */
  async cacheFile(fileId, fileData, isLarge = false) {
    return await this.cache.set(`file_${fileId}`, fileData, {
      category: this.categories.FILE,
      ttl: this.ttlSettings[this.categories.FILE],
      persistent: true,
      forceIndexedDB: isLarge,
    });
  }

  /**
   * Get cached file
   * @param {string} fileId - File ID
   */
  async getFile(fileId) {
    return await this.cache.get(`file_${fileId}`);
  }

  /**
   * Cache user avatar
   * @param {string} userId - User ID
   * @param {string} avatarData - Avatar data (base64 or URL)
   */
  async cacheAvatar(userId, avatarData) {
    return await this.cache.set(`avatar_${userId}`, avatarData, {
      category: this.categories.FILE,
      ttl: this.ttlSettings[this.categories.FILE],
      persistent: true,
    });
  }

  /**
   * Get cached avatar
   * @param {string} userId - User ID
   */
  async getAvatar(userId) {
    return await this.cache.get(`avatar_${userId}`);
  }

  // ====================
  // SETTINGS CACHING
  // ====================

  /**
   * Cache user settings/preferences
   * @param {Object} settings - Settings object
   */
  async cacheSettings(settings) {
    return await this.cache.set("user_settings", settings, {
      category: this.categories.SETTINGS,
      ttl: this.ttlSettings[this.categories.SETTINGS],
      persistent: true,
    });
  }

  /**
   * Get cached settings
   */
  async getSettings() {
    return await this.cache.get("user_settings", {});
  }

  /**
   * Update specific setting
   * @param {string} key - Setting key
   * @param {*} value - Setting value
   */
  async updateSetting(key, value) {
    const settings = await this.getSettings();
    settings[key] = value;
    return await this.cacheSettings(settings);
  }

  // ====================
  // CACHE INVALIDATION
  // ====================

  /**
   * Invalidate cache by category
   * @param {string} category - Category to invalidate
   */
  async invalidateCategory(category) {
    return await this.cache.clearByCategory(category);
  }

  /**
   * Invalidate specific data
   * @param {string} type - Data type (user, team, task, etc.)
   * @param {string} id - Optional ID for specific item
   */
  async invalidate(type, id = null) {
    const patterns = [];

    switch (type) {
      case "user":
        patterns.push("current_user", "user_settings");
        if (id)
          patterns.push(`user_${id}`, `user_profile_${id}`, `avatar_${id}`);
        break;

      case "team":
        patterns.push("user_teams");
        if (id) {
          patterns.push(
            `team_${id}`,
            `team_members_${id}`,
            `tasks_team_${id}`,
            `messages_${id}`
          );
        }
        break;

      case "task":
        patterns.push("user_tasks");
        if (id) patterns.push(`task_${id}`);
        break;

      case "message":
        if (id) patterns.push(`messages_${id}`);
        break;

      case "dashboard":
        patterns.push("dashboard_stats_organiser", "dashboard_stats_member");
        break;

      case "all":
        return await this.cache.clearAll();
    }

    // Remove matching patterns
    for (const pattern of patterns) {
      await this.cache.remove(pattern);
    }
  }

  /**
   * Setup cache invalidation event listeners
   */
  setupInvalidationListeners() {
    // Listen for user updates
    document.addEventListener("userUpdated", (event) => {
      const userId = event.detail?.userId;
      this.invalidate("user", userId);
    });

    // Listen for team updates
    document.addEventListener("teamUpdated", (event) => {
      const teamId = event.detail?.teamId;
      this.invalidate("team", teamId);
    });

    // Listen for task updates
    document.addEventListener("taskUpdated", (event) => {
      const taskId = event.detail?.taskId;
      this.invalidate("task", taskId);
    });

    // Listen for new messages
    document.addEventListener("messageReceived", (event) => {
      const teamId = event.detail?.teamId;
      const message = event.detail?.message;
      if (teamId && message) {
        this.addMessage(teamId, message);
      }
    });

    // Listen for logout to clear all cache
    document.addEventListener("userLoggedOut", () => {
      this.invalidate("all");
    });
  }

  // ====================
  // UTILITY METHODS
  // ====================

  /**
   * Get cache statistics
   */
  async getStats() {
    const baseStats = this.cache.getStorageStats();

    // Add CollabSpace-specific stats
    const keys = await this.cache.getKeys();
    const categoryStats = {};

    for (const category of Object.values(this.categories)) {
      categoryStats[category] = keys.filter(
        (key) =>
          key.includes(category) || this.getCategoryFromKey(key) === category
      ).length;
    }

    return {
      ...baseStats,
      categories: categoryStats,
      totalKeys: keys.length,
    };
  }

  /**
   * Determine category from cache key
   * @param {string} key - Cache key
   */
  getCategoryFromKey(key) {
    if (key.includes("user")) return this.categories.USER;
    if (key.includes("team")) return this.categories.TEAM;
    if (key.includes("task")) return this.categories.TASK;
    if (key.includes("message")) return this.categories.MESSAGE;
    if (key.includes("dashboard")) return this.categories.DASHBOARD;
    if (key.includes("file") || key.includes("avatar"))
      return this.categories.FILE;
    if (key.includes("settings")) return this.categories.SETTINGS;
    return "unknown";
  }

  /**
   * Preload essential data
   */
  async preloadEssentialData() {
    console.log("🏃‍♂️ Preloading essential cache data...");

    try {
      // Check if user data exists in cache
      const userData = await this.getUser();
      if (userData) {
        console.log("✅ User data loaded from cache");

        // Trigger event for UI updates
        document.dispatchEvent(
          new CustomEvent("cacheUserLoaded", {
            detail: { user: userData },
          })
        );
      }

      // Load teams if user exists
      if (userData) {
        const teams = await this.getTeams();
        if (teams.length > 0) {
          console.log(`✅ ${teams.length} teams loaded from cache`);

          document.dispatchEvent(
            new CustomEvent("cacheTeamsLoaded", {
              detail: { teams },
            })
          );
        }
      }
    } catch (error) {
      console.error("Error preloading cache data:", error);
    }
  }

  /**
   * Export cache data for backup
   */
  async exportCacheData() {
    const keys = await this.cache.getKeys();
    const exportData = {};

    for (const key of keys) {
      exportData[key] = await this.cache.get(key);
    }

    return {
      version: this.cache.version,
      timestamp: Date.now(),
      data: exportData,
    };
  }

  /**
   * Import cache data from backup
   * @param {Object} backupData - Backup data object
   */
  async importCacheData(backupData) {
    if (!backupData || !backupData.data) {
      throw new Error("Invalid backup data");
    }

    // Clear existing cache
    await this.cache.clearAll();

    // Import data
    for (const [key, value] of Object.entries(backupData.data)) {
      const category = this.getCategoryFromKey(key);
      await this.cache.set(key.replace("collabspace_", ""), value, {
        category,
        ttl: this.ttlSettings[category] || this.cache.defaultTTL,
        persistent: true,
      });
    }

    console.log("✅ Cache data imported successfully");
  }
}

// Export for use in other modules
window.CollabSpaceCacheAdapter = CollabSpaceCacheAdapter;

// Initialize cache adapter when browser cache is ready
document.addEventListener("DOMContentLoaded", () => {
  if (window.browserCache) {
    window.collabCache = new CollabSpaceCacheAdapter(window.browserCache);

    // Preload essential data
    setTimeout(() => {
      window.collabCache.preloadEssentialData();
    }, 1000);

    console.log("🎯 CollabSpace Cache Adapter ready");
  }
});

console.log("🔧 CollabSpace Cache Adapter loaded");
