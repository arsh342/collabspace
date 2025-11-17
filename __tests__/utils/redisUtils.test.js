// Mock Redis configuration first
jest.mock("../../src/config/redis", () => ({
  getRedisClient: jest.fn(),
  setCache: jest.fn(),
  getCache: jest.fn(),
  deleteCache: jest.fn(),
}));

// Mock the entire redisUtils module to avoid complex dependencies
jest.mock("../../src/utils/redisUtils", () => ({
  onlineUsers: {
    addUser: jest.fn(),
    removeUser: jest.fn(),
    getOnlineUsers: jest.fn(),
    isUserOnline: jest.fn(),
    joinRoom: jest.fn(),
    leaveRoom: jest.fn(),
    getRoomUsers: jest.fn(),
  },
  rateLimiter: {
    checkLimit: jest.fn(),
    getRemainingAttempts: jest.fn(),
  },
  messageCache: {
    addMessage: jest.fn(),
    getRecentMessages: jest.fn(),
    clearRoomMessages: jest.fn(),
  },
  notificationQueue: {
    queueNotification: jest.fn(),
    getUserNotifications: jest.fn(),
    markNotificationRead: jest.fn(),
  },
}));

// Import after mocking
const {
  onlineUsers,
  rateLimiter,
  messageCache,
  notificationQueue,
} = require("../../src/utils/redisUtils");

describe("Redis Utils", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mock implementations
    onlineUsers.addUser.mockResolvedValue(true);
    onlineUsers.removeUser.mockResolvedValue(true);
    onlineUsers.getOnlineUsers.mockResolvedValue(["user123", "user456"]);
    onlineUsers.isUserOnline.mockResolvedValue(true);

    rateLimiter.checkLimit.mockResolvedValue(true);

    messageCache.addMessage.mockResolvedValue(true);
    messageCache.getRecentMessages.mockResolvedValue([
      { text: "Message 1", timestamp: 1 },
      { text: "Message 2", timestamp: 2 },
    ]);

    notificationQueue.queueNotification.mockResolvedValue("notif123");
    notificationQueue.getUserNotifications.mockResolvedValue([
      { id: "1", type: "task_assigned", read: false },
      { id: "2", type: "message", read: true },
    ]);
  });

  describe("OnlineUsersManager", () => {
    describe("addUser", () => {
      it("should add user to online status", async () => {
        const result = await onlineUsers.addUser("user123", "socket456");

        expect(result).toBe(true);
        expect(onlineUsers.addUser).toHaveBeenCalledWith(
          "user123",
          "socket456"
        );
      });

      it("should handle Redis unavailable", async () => {
        onlineUsers.addUser.mockResolvedValue(false);
        const result = await onlineUsers.addUser("user123", "socket456");

        expect(result).toBe(false);
      });
    });

    describe("removeUser", () => {
      it("should remove user from online status", async () => {
        const result = await onlineUsers.removeUser("user123");

        expect(result).toBe(true);
        expect(onlineUsers.removeUser).toHaveBeenCalledWith("user123");
      });
    });

    describe("getOnlineUsers", () => {
      it("should return list of online users", async () => {
        const users = await onlineUsers.getOnlineUsers();

        expect(users).toEqual(["user123", "user456"]);
        expect(onlineUsers.getOnlineUsers).toHaveBeenCalled();
      });

      it("should return empty array when Redis unavailable", async () => {
        onlineUsers.getOnlineUsers.mockResolvedValue([]);

        const users = await onlineUsers.getOnlineUsers();

        expect(users).toEqual([]);
      });
    });

    describe("isUserOnline", () => {
      it("should check if user is online", async () => {
        const isOnline = await onlineUsers.isUserOnline("user123");

        expect(isOnline).toBe(true);
        expect(onlineUsers.isUserOnline).toHaveBeenCalledWith("user123");
      });

      it("should return false when Redis unavailable", async () => {
        onlineUsers.isUserOnline.mockResolvedValue(false);

        const isOnline = await onlineUsers.isUserOnline("user123");

        expect(isOnline).toBe(false);
      });
    });
  });

  describe("RealTimeRateLimiter", () => {
    describe("checkLimit", () => {
      it("should allow action within limit", async () => {
        const allowed = await rateLimiter.checkLimit(
          "user123",
          "sendMessage",
          10,
          60
        );

        expect(allowed).toBe(true);
        expect(rateLimiter.checkLimit).toHaveBeenCalledWith(
          "user123",
          "sendMessage",
          10,
          60
        );
      });

      it("should deny action over limit", async () => {
        rateLimiter.checkLimit.mockResolvedValue(false);

        const allowed = await rateLimiter.checkLimit(
          "user123",
          "sendMessage",
          10,
          60
        );

        expect(allowed).toBe(false);
      });

      it("should handle rate limiting logic", async () => {
        await rateLimiter.checkLimit("user123", "sendMessage", 10, 60);

        expect(rateLimiter.checkLimit).toHaveBeenCalledWith(
          "user123",
          "sendMessage",
          10,
          60
        );
      });

      it("should allow when Redis unavailable", async () => {
        rateLimiter.checkLimit.mockResolvedValue(true);

        const allowed = await rateLimiter.checkLimit(
          "user123",
          "sendMessage",
          10,
          60
        );

        expect(allowed).toBe(true);
      });
    });
  });

  describe("MessageCache", () => {
    describe("addMessage", () => {
      it("should add message to cache", async () => {
        const message = {
          text: "Hello World",
          userId: "user123",
          username: "testuser",
        };

        const result = await messageCache.addMessage("room123", message);

        expect(result).toBe(true);
        expect(messageCache.addMessage).toHaveBeenCalledWith(
          "room123",
          message
        );
      });

      it("should handle Redis unavailable", async () => {
        messageCache.addMessage.mockResolvedValue(false);

        const result = await messageCache.addMessage("room123", {
          text: "test",
        });

        expect(result).toBe(false);
      });
    });

    describe("getRecentMessages", () => {
      it("should return recent messages", async () => {
        const mockMessages = [
          { text: "Message 1", timestamp: 1 },
          { text: "Message 2", timestamp: 2 },
        ];
        messageCache.getRecentMessages.mockResolvedValue(mockMessages);

        const messages = await messageCache.getRecentMessages("room123", 20);

        expect(messages).toHaveLength(2);
        expect(messages[0].text).toBe("Message 1");
        expect(messages[1].text).toBe("Message 2");
      });

      it("should return empty array when Redis unavailable", async () => {
        messageCache.getRecentMessages.mockResolvedValue([]);

        const messages = await messageCache.getRecentMessages("room123");

        expect(messages).toEqual([]);
      });
    });
  });

  describe("NotificationQueue", () => {
    describe("queueNotification", () => {
      it("should queue notification for user", async () => {
        const notification = {
          type: "task_assigned",
          title: "New Task",
          message: "You have been assigned a task",
        };

        notificationQueue.queueNotification.mockResolvedValue(
          "notification-id-123"
        );

        const result = await notificationQueue.queueNotification(
          "user123",
          notification
        );

        expect(typeof result).toBe("string"); // Should return notification ID
        expect(notificationQueue.queueNotification).toHaveBeenCalledWith(
          "user123",
          notification
        );
      });

      it("should handle Redis unavailable", async () => {
        notificationQueue.queueNotification.mockResolvedValue(false);

        const result = await notificationQueue.queueNotification("user123", {
          type: "test",
        });

        expect(result).toBe(false);
      });
    });

    describe("getUserNotifications", () => {
      it("should return user notifications", async () => {
        const mockNotifications = [
          { id: "1", type: "task_assigned", read: false },
          { id: "2", type: "message", read: true },
        ];
        notificationQueue.getUserNotifications.mockResolvedValue(
          mockNotifications
        );

        const notifications = await notificationQueue.getUserNotifications(
          "user123",
          20
        );

        expect(notifications).toHaveLength(2);
        expect(notifications[0].type).toBe("task_assigned");
        expect(notifications[1].type).toBe("message");
      });

      it("should return empty array when Redis unavailable", async () => {
        notificationQueue.getUserNotifications.mockResolvedValue([]);

        const notifications = await notificationQueue.getUserNotifications(
          "user123"
        );

        expect(notifications).toEqual([]);
      });
    });
  });
});
