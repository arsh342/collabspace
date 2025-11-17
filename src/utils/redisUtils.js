const {
  getRedisClient,
  setCache,
  getCache,
  deleteCache,
} = require("../config/redis");

/**
 * Redis utilities for real-time features (Socket.IO, online users, etc.)
 */

// Online users management
class OnlineUsersManager {
  constructor() {
    this.prefix = "online:";
    this.roomPrefix = "room:";
  }

  async addUser(userId, socketId) {
    try {
      const client = getRedisClient();
      if (!client || !client.isReady) return false;

      // Set user as online with socket ID
      await client.setEx(
        `${this.prefix}${userId}`,
        3600,
        JSON.stringify({
          socketId,
          timestamp: Date.now(),
          status: "online",
        }),
      );

      // Add to online users set
      await client.sAdd("online:users", userId);

      return true;
    } catch (error) {
      console.error("Error adding online user:", error);
      return false;
    }
  }

  async removeUser(userId) {
    try {
      const client = getRedisClient();
      if (!client || !client.isReady) return false;

      // Remove user from online status
      await client.del(`${this.prefix}${userId}`);
      await client.sRem("online:users", userId);

      return true;
    } catch (error) {
      console.error("Error removing online user:", error);
      return false;
    }
  }

  async getUserSocketId(userId) {
    try {
      const userData = await getCache(`${this.prefix}${userId}`);
      return userData ? userData.socketId : null;
    } catch (error) {
      console.error("Error getting user socket ID:", error);
      return null;
    }
  }

  async getOnlineUsers() {
    try {
      const client = getRedisClient();
      if (!client || !client.isReady) return [];

      const userIds = await client.sMembers("online:users");
      return userIds;
    } catch (error) {
      console.error("Error getting online users:", error);
      return [];
    }
  }

  async isUserOnline(userId) {
    try {
      const client = getRedisClient();
      if (!client || !client.isReady) return false;

      return await client.sIsMember("online:users", userId);
    } catch (error) {
      console.error("Error checking if user is online:", error);
      return false;
    }
  }

  // Room management for team chats
  async joinRoom(userId, roomId) {
    try {
      const client = getRedisClient();
      if (!client || !client.isReady) return false;

      await client.sAdd(`${this.roomPrefix}${roomId}`, userId);
      return true;
    } catch (error) {
      console.error("Error joining room:", error);
      return false;
    }
  }

  async leaveRoom(userId, roomId) {
    try {
      const client = getRedisClient();
      if (!client || !client.isReady) return false;

      await client.sRem(`${this.roomPrefix}${roomId}`, userId);
      return true;
    } catch (error) {
      console.error("Error leaving room:", error);
      return false;
    }
  }

  async getRoomUsers(roomId) {
    try {
      const client = getRedisClient();
      if (!client || !client.isReady) return [];

      return await client.sMembers(`${this.roomPrefix}${roomId}`);
    } catch (error) {
      console.error("Error getting room users:", error);
      return [];
    }
  }
}

// Rate limiting for real-time actions
class RealTimeRateLimiter {
  constructor() {
    this.prefix = "rate:";
  }

  async checkLimit(userId, action, limit = 10, windowSeconds = 60) {
    try {
      const client = getRedisClient();
      if (!client || !client.isReady) return true; // Allow if Redis unavailable

      const key = `${this.prefix}${userId}:${action}`;
      const current = await client.incr(key);

      if (current === 1) {
        await client.expire(key, windowSeconds);
      }

      return current <= limit;
    } catch (error) {
      console.error("Error checking rate limit:", error);
      return true; // Allow on error
    }
  }

  async getRemainingAttempts(userId, action, limit = 10) {
    try {
      const client = getRedisClient();
      if (!client || !client.isReady) return limit;

      const key = `${this.prefix}${userId}:${action}`;
      const current = await client.get(key);

      return Math.max(0, limit - (parseInt(current) || 0));
    } catch (error) {
      console.error("Error getting remaining attempts:", error);
      return limit;
    }
  }
}

// Message caching for recent chat history
class MessageCache {
  constructor() {
    this.prefix = "messages:";
    this.maxMessages = 50; // Keep last 50 messages per room
  }

  async addMessage(roomId, message) {
    try {
      const client = getRedisClient();
      if (!client || !client.isReady) return false;

      const key = `${this.prefix}${roomId}`;

      // Add message to list (most recent first)
      await client.lPush(
        key,
        JSON.stringify({
          ...message,
          timestamp: Date.now(),
        }),
      );

      // Trim to keep only recent messages
      await client.lTrim(key, 0, this.maxMessages - 1);

      // Set expiration (7 days)
      await client.expire(key, 7 * 24 * 3600);

      return true;
    } catch (error) {
      console.error("Error adding message to cache:", error);
      return false;
    }
  }

  async getRecentMessages(roomId, count = 20) {
    try {
      const client = getRedisClient();
      if (!client || !client.isReady) return [];

      const key = `${this.prefix}${roomId}`;
      const messages = await client.lRange(key, 0, count - 1);

      return messages.map((msg) => JSON.parse(msg)).reverse(); // Return in chronological order
    } catch (error) {
      console.error("Error getting recent messages:", error);
      return [];
    }
  }

  async clearRoomMessages(roomId) {
    try {
      const client = getRedisClient();
      if (!client || !client.isReady) return false;

      await client.del(`${this.prefix}${roomId}`);
      return true;
    } catch (error) {
      console.error("Error clearing room messages:", error);
      return false;
    }
  }
}

// Notification queue management
class NotificationQueue {
  constructor() {
    this.queueKey = "notifications:queue";
    this.userNotificationsPrefix = "notifications:user:";
  }

  async queueNotification(userId, notification) {
    try {
      const client = getRedisClient();
      if (!client || !client.isReady) return false;

      const notificationData = {
        userId,
        ...notification,
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
        read: false,
      };

      // Add to global queue
      await client.lPush(this.queueKey, JSON.stringify(notificationData));

      // Add to user-specific notifications
      const userKey = `${this.userNotificationsPrefix}${userId}`;
      await client.lPush(userKey, JSON.stringify(notificationData));

      // Keep only last 100 notifications per user
      await client.lTrim(userKey, 0, 99);

      // Set expiration (30 days)
      await client.expire(userKey, 30 * 24 * 3600);

      return notificationData.id;
    } catch (error) {
      console.error("Error queuing notification:", error);
      return false;
    }
  }

  async getUserNotifications(userId, count = 20) {
    try {
      const client = getRedisClient();
      if (!client || !client.isReady) return [];

      const userKey = `${this.userNotificationsPrefix}${userId}`;
      const notifications = await client.lRange(userKey, 0, count - 1);

      return notifications.map((notif) => JSON.parse(notif));
    } catch (error) {
      console.error("Error getting user notifications:", error);
      return [];
    }
  }

  async markNotificationRead(userId, notificationId) {
    try {
      const client = getRedisClient();
      if (!client || !client.isReady) return false;

      const userKey = `${this.userNotificationsPrefix}${userId}`;
      const notifications = await client.lRange(userKey, 0, -1);

      // Update the specific notification
      for (let i = 0; i < notifications.length; i++) {
        const notif = JSON.parse(notifications[i]);
        if (notif.id === notificationId) {
          notif.read = true;
          await client.lSet(userKey, i, JSON.stringify(notif));
          return true;
        }
      }

      return false;
    } catch (error) {
      console.error("Error marking notification as read:", error);
      return false;
    }
  }
}

// Initialize instances
const onlineUsers = new OnlineUsersManager();
const rateLimiter = new RealTimeRateLimiter();
const messageCache = new MessageCache();
const notificationQueue = new NotificationQueue();

module.exports = {
  OnlineUsersManager,
  RealTimeRateLimiter,
  MessageCache,
  NotificationQueue,
  onlineUsers,
  rateLimiter,
  messageCache,
  notificationQueue,
};
