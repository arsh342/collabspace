const express = require("express");
const path = require("path");
const http = require("http");
const socketIo = require("socket.io");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const RedisStore = require("connect-redis").default;
require("dotenv").config();

// Import configurations and middleware
const connectDB = require("./config/database");
const { connectRedis, getRedisClient } = require("./config/redis");
const logger = require("./middleware/logger");
const errorHandler = require("./middleware/errorHandler");
const {
  authenticateSession,
  authenticateWeb,
  requireOrganiser,
  requireOrganiserWeb,
  requireTeamMember,
  requireTeamMemberWeb,
} = require("./middleware/auth");
const {
  apiLimiter,
  authLimiter,
  dashboardLimiter,
} = require("./middleware/rateLimiter");

// Import models
const User = require("./models/User");

// Import routes
const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/users");
const teamRoutes = require("./routes/teams");
const taskRoutes = require("./routes/tasks");
const messageRoutes = require("./routes/messages");
const chatRoutes = require("./routes/chat");
const dashboardRoutes = require("./routes/dashboard");
const uploadRoutes = require("./routes/upload");
const paymentRoutes = require("./routes/payments");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);
// In-memory map organiserId -> Set of socket ids
const organiserSockets = new Map();
const { computeOrganiserSummary } = require("./utils/dashboardSummary");
const {
  onlineUsers,
  messageCache,
  rateLimiter,
  notificationQueue,
} = require("./utils/redisUtils");

// Connect to MongoDB unless running automated tests
if (process.env.NODE_ENV !== "test") {
  connectDB();
}

// Connect to Redis for caching and session storage
let redisClient = null;
if (process.env.NODE_ENV !== "test") {
  connectRedis()
    .then((client) => {
      redisClient = client;
      console.log("Redis integration initialized");
    })
    .catch((error) => {
      console.warn(
        "Redis connection failed, falling back to MongoDB for sessions:",
        error.message
      );
    });
}

// Security middleware
app.use(cors());

// Apply rate limiting
app.use("/api/", apiLimiter); // General API rate limiting

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Session configuration with Redis/MongoDB fallback
const sessionConfig = {
  secret:
    process.env.SESSION_SECRET ||
    "your-fallback-secret-key-change-in-production",
  resave: false,
  saveUninitialized: false,
  name: "collabspace.sid", // Custom session name for better security
  cookie: {
    secure: process.env.NODE_ENV === "production", // HTTPS in production, HTTP in development
    httpOnly: false, // Allow JS access for debugging and client-side session management
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days in milliseconds
    sameSite: "lax", // More permissive for embedded browsers
  },
};

// Use Redis for session storage if available, otherwise fall back to MongoDB
if (redisClient && redisClient.isReady) {
  sessionConfig.store = new RedisStore({
    client: redisClient,
    prefix: "collabspace:sess:",
    ttl: parseInt(process.env.REDIS_SESSION_TTL) || 86400, // 1 day in seconds
  });
  console.log("Using Redis for session storage");
} else {
  sessionConfig.store = MongoStore.create({
    mongoUrl:
      process.env.MONGODB_URI || "mongodb://localhost:27017/collabspace",
    touchAfter: 24 * 3600, // Lazy session update (only update if changed)
    ttl: 30 * 24 * 60 * 60, // Session TTL of 30 days in seconds
  });
  console.log("Using MongoDB for session storage");
}

app.use(session(sessionConfig));

// Custom logging middleware
app.use(logger.loggerMiddleware);

// Static files
app.use("/public", express.static(path.join(__dirname, "public")));
// CSS route mapping for convenience
app.use("/css", express.static(path.join(__dirname, "public", "css")));

// View engine setup
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// API Routes with specific rate limiting
app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/teams", teamRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/messages", messageRoutes);
app.use(
  "/api/chat",
  (req, res, next) => {
    req.io = io;
    next();
  },
  chatRoutes
);
app.use("/api/upload", uploadRoutes);
app.use("/api", uploadRoutes); // This will handle /api/files/:filename
app.use("/api/dashboard", dashboardLimiter, dashboardRoutes);
app.use("/api/member", require("./routes/member-api-simple"));
app.use("/api/invitations", require("./routes/invitations"));
app.use("/api/payments", paymentRoutes);

// Frontend Routes
app.get("/", (req, res) => {
  res.render("pages/index", {
    title: "CollabSpace - Team Collaboration Platform",
    user: null,
  });
});

app.get("/register", (req, res) => {
  res.render("auth/register", {
    title: "Register - CollabSpace",
    user: null,
  });
});

app.get("/login", (req, res) => {
  res.render("auth/login", {
    title: "Login - CollabSpace",
    user: null,
  });
});

// Logout route for web requests
app.get("/logout", (req, res) => {
  if (req.session) {
    req.session.destroy((err) => {
      if (err) {
        logger.logger.error("Web logout session destruction error:", err);
      }
      // Clear all authentication cookies
      res.clearCookie("collabspace.sid");
      res.clearCookie("connect.sid");
      res.clearCookie("user");
      res.clearCookie("token");
      logger.logger.info(`User logged out via web route`);
    });
  }
  res.redirect("/login");
});

app.get("/dashboard", (req, res) => {
  // For now, render dashboard without authentication check
  // In production, you would add authentication middleware here
  const mockUser = {
    firstName: "User",
    lastName: "Name",
    role: "member",
    username: "user",
  };
  res.render("dashboard/index", {
    title: "Dashboard",
    user: mockUser,
    path: "/dashboard",
  });
});

app.get(
  "/organiser-dashboard",
  authenticateWeb,
  requireOrganiserWeb,
  (req, res) => {
    res.render("dashboard/organiser", {
      title: "Organiser Dashboard",
      user: req.user,
      path: "/organiser-dashboard",
    });
  }
);

app.get("/member-dashboard", authenticateWeb, (req, res) => {
  console.log("Member dashboard route accessed");
  console.log("User:", req.user);
  console.log("User role:", req.user?.role);

  // Check if user has the right role
  if (!req.user) {
    console.log("No user found, redirecting to login");
    return res.redirect("/login");
  }

  if (req.user.role !== "Team Member") {
    console.log("User role is not Team Member, role is:", req.user.role);
    return res
      .status(403)
      .send(
        `Access denied. Your role is: ${req.user.role}. Team Member access required.`
      );
  }

  console.log("Rendering member dashboard for user:", req.user.username);
  res.render("dashboard/member", {
    title: "Team Member Dashboard",
    user: req.user,
    path: "/member-dashboard",
    plan: req.user?.plan || "free",
    isPro: Boolean(req.user?.isPro),
    isOrganiser: req.user?.role === "Organiser",
  });
});

// Handle Chrome DevTools requests silently
app.get("/.well-known/appspecific/com.chrome.devtools.json", (req, res) => {
  res.status(204).send();
});

// Redirect teams page to organiser dashboard since teams are managed there
app.get("/teams", (req, res) => {
  res.redirect("/organiser-dashboard");
});

// Handle direct team page navigation and redirect to organiser dashboard
app.get("/teams/:id", (req, res) => {
  res.redirect("/organiser-dashboard");
});

app.get("/tasks", (req, res) => {
  const mockUser = {
    firstName: "John",
    lastName: "Doe",
    role: "admin",
  };
  res.render("tasks", {
    title: "Tasks - CollabSpace",
    user: mockUser,
    path: "/tasks",
  });
});

app.get("/chat", authenticateSession, (req, res) => {
  res.render("chat", {
    title: "Chat - CollabSpace",
    user: req.user,
    path: "/chat",
  });
});

app.get("/profile", (req, res) => {
  const mockUser = {
    firstName: "John",
    lastName: "Doe",
    role: "admin",
  };
  res.render("profile", {
    title: "Profile - CollabSpace",
    user: mockUser,
    path: "/profile",
  });
});

app.get("/settings", (req, res) => {
  const mockUser = {
    firstName: "John",
    lastName: "Doe",
    role: "admin",
  };
  res.render("dashboard/settings", {
    title: "Settings - CollabSpace",
    user: mockUser,
    path: "/settings",
  });
});

// Additional static pages routes
app.get("/enterprise", (req, res) => {
  res.render("pages/enterprise", {
    title: "Enterprise - CollabSpace",
    path: "/enterprise",
  });
});

app.get("/contact", (req, res) => {
  res.render("pages/contact", {
    title: "Contact Us - CollabSpace",
    path: "/contact",
  });
});

app.get("/privacy", (req, res) => {
  res.render("legal/privacy", {
    title: "Privacy Policy - CollabSpace",
    path: "/privacy",
  });
});

app.get("/terms", (req, res) => {
  res.render("legal/terms", {
    title: "Terms of Service - CollabSpace",
    path: "/terms",
  });
});

app.get("/payment", (req, res) => {
  const proUnitAmount = Number.parseInt(
    process.env.STRIPE_PRO_UNIT_AMOUNT || "5900",
    10
  );
  const planCurrency = (process.env.STRIPE_CURRENCY || "usd").toUpperCase();
  const maxSeats = Number.parseInt(
    process.env.STRIPE_PRO_MAX_SEATS || "500",
    10
  );

  res.render("pages/payment", {
    title: "Payment - CollabSpace",
    path: "/payment",
    stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY || "",
    isAuthenticated: Boolean(req.user),
    pricing: {
      plan: "pro",
      currency: planCurrency,
      unitAmount: proUnitAmount,
      unitAmountDisplay: Number.isFinite(proUnitAmount)
        ? (proUnitAmount / 100).toFixed(2)
        : "59.00",
      seatMax: Number.isFinite(maxSeats) ? maxSeats : 500,
    },
  });
});

app.get("/help", (req, res) => {
  res.render("pages/help", {
    title: "Help Center - CollabSpace",
    path: "/help",
  });
});

app.get("/security", (req, res) => {
  res.render("legal/security", {
    title: "Security - CollabSpace",
    path: "/security",
  });
});

app.get("/docs", (req, res) => {
  res.render("docs/docs", {
    title: "Documentation - CollabSpace",
    path: "/docs",
  });
});

app.get("/api", (req, res) => {
  res.render("docs/api", {
    title: "API Documentation - CollabSpace",
    path: "/api",
  });
});

app.get("/status", (req, res) => {
  res.render("dashboard/status", {
    title: "System Status - CollabSpace",
    path: "/status",
  });
});

app.get("/careers", (req, res) => {
  res.render("pages/careers", {
    title: "Careers - CollabSpace",
    path: "/careers",
  });
});

app.get("/blog", (req, res) => {
  res.render("pages/blog", {
    title: "Blog - CollabSpace",
    path: "/blog",
  });
});

app.get("/guides", (req, res) => {
  res.render("docs/guides", {
    title: "Guides - CollabSpace",
    path: "/guides",
  });
});

// Store organiser socket connections
// Store team user connections
const teamUsers = new Map(); // Map of teamId -> Set of userIds

// Socket.IO connection handling
io.on("connection", (socket) => {
  logger.logger.info(`User connected: ${socket.id}`);

  // Register organiser dashboard listener
  socket.on("registerOrganiser", async (organiserId) => {
    try {
      if (!organiserId) return;

      // Legacy in-memory storage
      if (!organiserSockets.has(organiserId)) {
        organiserSockets.set(organiserId, new Set());
      }
      organiserSockets.get(organiserId).add(socket.id);

      // Redis online user management
      await onlineUsers.addUser(organiserId, socket.id);

      // Join user room for personal notifications
      socket.join(`user_${organiserId}`);
      socket.currentUserId = organiserId;

      logger.logger.info(
        `Socket ${socket.id} registered for organiser ${organiserId}`
      );

      // Send initial summary
      const summary = await computeOrganiserSummary(organiserId);
      socket.emit("dashboardSummary", summary);
    } catch (e) {
      logger.logger.error("Error registering organiser socket", e);
    }
  });

  // Register member dashboard listener
  socket.on("registerMember", async (memberId) => {
    try {
      if (!memberId) return;

      // Redis online user management
      await onlineUsers.addUser(memberId, socket.id);

      // Join user room for personal notifications
      socket.join(`user_${memberId}`);
      socket.currentUserId = memberId;

      logger.logger.info(
        `Socket ${socket.id} registered for member ${memberId}`
      );
    } catch (e) {
      logger.logger.error("Error registering member socket", e);
    }
  });

  // Join team room
  socket.on("join team", async (data) => {
    const { teamId, userId } = data;

    try {
      // Update user's lastSeen timestamp for online status
      await User.findByIdAndUpdate(userId, { lastSeen: new Date() });

      // Leave previous team if any (both legacy and Redis)
      if (socket.currentTeam && socket.currentUserId) {
        socket.leave(`team-${socket.currentTeam}`);
        removeUserFromTeam(socket.currentTeam, socket.currentUserId);
        updateOnlineCount(socket.currentTeam);
        await onlineUsers.leaveRoom(socket.currentUserId, socket.currentTeam);
      }

      // Join new team (both legacy and Redis)
      socket.join(`team-${teamId}`);
      socket.currentTeam = teamId;
      socket.currentUserId = userId;

      // Track user in team (legacy)
      if (!teamUsers.has(teamId)) {
        teamUsers.set(teamId, new Set());
      }
      teamUsers.get(teamId).add(userId);

      // Track user in team (Redis)
      await onlineUsers.joinRoom(userId, teamId);

      logger.logger.info(`User ${userId} (${socket.id}) joined team ${teamId}`);

      // Update online count for this team
      updateOnlineCount(teamId);

      // Load recent messages from Redis cache
      const recentMessages = await messageCache.getRecentMessages(teamId, 20);
      if (recentMessages.length > 0) {
        socket.emit("recent messages", recentMessages);
      }
    } catch (error) {
      logger.logger.error(`Error updating user lastSeen for ${userId}:`, error);
    }
  });

  // Leave team room
  socket.on("leave team", async (data) => {
    const { teamId } = data;

    try {
      if (socket.currentTeam === teamId && socket.currentUserId) {
        socket.leave(`team-${teamId}`);
        removeUserFromTeam(teamId, socket.currentUserId);
        updateOnlineCount(teamId);

        // Redis room management
        await onlineUsers.leaveRoom(socket.currentUserId, teamId);

        logger.logger.info(
          `User ${socket.currentUserId} (${socket.id}) left team ${teamId}`
        );

        // Clear current team info
        socket.currentTeam = null;
      }
    } catch (error) {
      logger.logger.error(`Error leaving team ${teamId}:`, error);
    }
  });

  // Handle chat messages
  socket.on("send message", async (data) => {
    try {
      // Rate limiting check
      const canSend = await rateLimiter.checkLimit(data.userId, "message");
      if (!canSend) {
        socket.emit("rate limit exceeded", {
          message:
            "You're sending messages too quickly. Please wait before sending another.",
        });
        return;
      }

      // Update user's lastSeen timestamp
      if (data.userId) {
        await User.findByIdAndUpdate(data.userId, { lastSeen: new Date() });
      }

      // Cache the message in Redis
      await messageCache.addMessage(data.teamId, data);

      // Broadcast message to team
      socket.to(`team-${data.teamId}`).emit("new message", data);
      logger.logger.info(
        `Message sent in team ${data.teamId}: ${data.content}`
      );
    } catch (error) {
      logger.logger.error(`Error updating user lastSeen for message:`, error);
    }
  });

  // Handle typing indicators
  socket.on("typing", (data) => {
    socket.to(`team-${data.teamId}`).emit("user typing", data);
  });

  socket.on("stop typing", (data) => {
    socket.to(`team-${data.teamId}`).emit("user stopped typing", data);
  });

  // Handle task updates
  socket.on("task update", (data) => {
    socket.to(`team-${data.teamId}`).emit("task updated", data);
    logger.logger.info(`Task updated in team ${data.teamId}: ${data.taskId}`);
  });

  // Handle user status
  socket.on("user status", (data) => {
    socket.to(`team-${data.teamId}`).emit("user status changed", data);
    logger.logger.info(`User status changed: ${data.userId} - ${data.status}`);
  });

  socket.on("disconnect", async () => {
    logger.logger.info(`User disconnected: ${socket.id}`);

    try {
      // Update user's lastSeen timestamp on disconnect
      if (socket.currentUserId) {
        await User.findByIdAndUpdate(socket.currentUserId, {
          lastSeen: new Date(),
        });
      }

      // Redis cleanup - remove user from online tracking
      if (socket.currentUserId) {
        await onlineUsers.removeUser(socket.currentUserId);

        // Leave any Redis rooms
        if (socket.currentTeam) {
          await onlineUsers.leaveRoom(socket.currentUserId, socket.currentTeam);
        }
      }

      // Remove user from team tracking
      if (socket.currentTeam && socket.currentUserId) {
        removeUserFromTeam(socket.currentTeam, socket.currentUserId);
        updateOnlineCount(socket.currentTeam);
      }

      // Cleanup organiser socket registration
      for (const [orgId, set] of organiserSockets.entries()) {
        if (set.has(socket.id)) {
          set.delete(socket.id);
          if (set.size === 0) organiserSockets.delete(orgId);
          break;
        }
      }
    } catch (error) {
      logger.logger.error(`Error updating user lastSeen on disconnect:`, error);
    }
  });
});

// Helper functions for team user tracking
function removeUserFromTeam(teamId, userId) {
  if (teamUsers.has(teamId)) {
    teamUsers.get(teamId).delete(userId);
    if (teamUsers.get(teamId).size === 0) {
      teamUsers.delete(teamId);
    }
  }
}

function updateOnlineCount(teamId) {
  const onlineCount = teamUsers.has(teamId) ? teamUsers.get(teamId).size : 0;
  io.to(`team-${teamId}`).emit("onlineCountUpdate", {
    teamId,
    count: onlineCount,
  });
  logger.logger.info(`Team ${teamId} online count: ${onlineCount}`);
}

// Helper to emit updated summary to organiser sockets
async function emitOrganiserSummary(organiserId) {
  try {
    if (!organiserSockets.has(organiserId)) return;
    const summary = await computeOrganiserSummary(organiserId);
    for (const socketId of organiserSockets.get(organiserId)) {
      io.to(socketId).emit("dashboardSummary", summary);
    }
  } catch (e) {
    logger.logger.error("Failed emitting organiser summary", e);
  }
}

// Error handling middleware (must be last)
app.use(errorHandler.errorHandler);
app.use(errorHandler.notFound);

// Handle unhandled promise rejections
process.on("unhandledRejection", (err, promise) => {
  logger.logger.error(`Unhandled Rejection at: ${promise}, reason: ${err}`);
  server.close(() => process.exit(1));
});

// Handle uncaught exceptions
process.on("uncaughtException", (err) => {
  logger.logger.error(`Uncaught Exception: ${err}`);
  server.close(() => process.exit(1));
});

const PORT = process.env.PORT || 3000;

if (process.env.NODE_ENV !== "test") {
  server.listen(PORT, () => {
    logger.logger.info(`Server running on port ${PORT}`);
    logger.logger.info(`Environment: ${process.env.NODE_ENV || "development"}`);
  });
}

module.exports = {
  app,
  server,
  io,
  emitOrganiserSummary,
};
