const express = require("express");
const path = require("path");
const http = require("http");
const https = require("https");
const socketIo = require("socket.io");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const RedisStore = require("connect-redis").default;
require("dotenv").config();

// Import SSL configuration
const SSLManager = require("./config/ssl");

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

// Initialize SSL Manager
const sslManager = new SSLManager();
let server;
let useHTTPS = false;

// This will be initialized after SSL setup
let io;

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
  // Add a timeout to Redis connection attempt
  Promise.race([
    connectRedis(),
    new Promise((_, reject) =>
      setTimeout(
        () => reject(new Error("Redis connection timeout after 10s")),
        10000
      )
    ),
  ])
    .then((client) => {
      if (client) {
        redisClient = client;
        console.log("Redis integration initialized");
      } else {
        console.log("Redis not available, using MongoDB-only mode");
      }
    })
    .catch((error) => {
      console.log(
        "Redis connection failed, using MongoDB-only mode:",
      redisClient = client;
      // Redis integration initialized
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

// SSL security headers (will be set up after SSL initialization)
// This will be added dynamically after server setup

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
  // Using Redis for session storage
} else {
  sessionConfig.store = MongoStore.create({
    mongoUrl:
      process.env.MONGODB_URI || "mongodb://localhost:27017/collabspace",
    touchAfter: 24 * 3600, // Lazy session update (only update if changed)
    ttl: 30 * 24 * 60 * 60, // Session TTL of 30 days in seconds
  });
  // Using MongoDB for session storage
}

app.use(session(sessionConfig));

// Custom logging middleware
app.use(logger.loggerMiddleware);

// Static files
app.use("/public", express.static(path.join(__dirname, "public")));
// CSS route mapping for convenience
app.use("/css", express.static(path.join(__dirname, "public", "css")));

// Handle common favicon requests to prevent 404 errors
app.get("/favicon.ico", (req, res) => {
  res.status(204).end(); // No content
});

app.get("/apple-touch-icon.png", (req, res) => {
  res.status(204).end(); // No content
});

app.get("/apple-touch-icon-precomposed.png", (req, res) => {
  res.status(204).end(); // No content
});

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
  // Check if user has the right role
  if (!req.user) {
    return res.redirect("/login");
  }

  if (req.user.role !== "Team Member") {
    return res
      .status(403)
      .send(
        `Access denied. Your role is: ${req.user.role}. Team Member access required.`
      );
  }

  res.render("dashboard/member", {
    title: "Team Member Dashboard",
    user: req.user,
    path: "/member-dashboard",
    plan: req.user?.plan || "free",
    isPro: Boolean(req.user?.isPro),
    isOrganiser: req.user?.role === "Organiser",
  });
});

// Cache system test page (accessible to all authenticated users)
app.get("/cache-test", authenticateWeb, (req, res) => {
  res.render("cache-test", {
    title: "Cache System Test - CollabSpace",
    user: req.user,
    path: "/cache-test",
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

app.get("/chat", authenticateSession, (req, res) => {
  res.render("chat", {
    title: "Chat - CollabSpace",
    user: req.user,
    path: "/chat",
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

// Store team user connections
const teamUsers = new Map(); // Map of teamId -> Set of userIds

// Helper functions for team user tracking
function removeUserFromTeam(teamId, userId) {
  if (teamUsers.has(teamId)) {
    teamUsers.get(teamId).delete(userId);
    if (teamUsers.get(teamId).size === 0) {
      teamUsers.delete(teamId);
    }
  }
}
// Socket.IO connection handling
io.on("connection", (socket) => {
  // logger.logger.info(`User connected: ${socket.id}`); // Reduced logging

  // Register organiser dashboard listener
  socket.on("registerOrganiser", async (organiserId) => {
    try {
      if (!organiserId) return;

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
      // logger.logger.info(
      //   `Socket ${socket.id} registered for organiser ${organiserId}`
      // ); // Reduced logging

// Handle uncaught exceptions
process.on("uncaughtException", (err) => {
  logger.logger.error(`Uncaught Exception: ${err}`);
  server.close(() => process.exit(1));
});

const PORT = process.env.PORT || 3000;
const HTTP_PORT = process.env.HTTP_PORT || 3000;
const HTTPS_PORT = process.env.HTTPS_PORT || 3443;

// Initialize SSL and start server
async function initializeServer() {
  try {
    // Initialize SSL configuration
    useHTTPS = await sslManager.initialize();

    if (useHTTPS) {
      // Create HTTPS server
      server = sslManager.createHTTPSServer(app);

      // Add security headers middleware
      app.use(sslManager.httpsRedirectMiddleware());
      app.use(sslManager.securityHeadersMiddleware());
      // logger.logger.info(
      //   `Socket ${socket.id} registered for member ${memberId}`
      // ); // Reduced logging
    } catch (e) {
      logger.logger.error("Error registering member socket", e);
    }
  });

      console.log("🔒 HTTPS mode enabled");

      // Optionally create HTTP server for redirects in production
      if (process.env.NODE_ENV === "production") {
        const httpApp = express();
        httpApp.use("*", (req, res) => {
          res.redirect(`https://${req.headers.host}${req.url}`);
        });

        const httpServer = http.createServer(httpApp);
        httpServer.listen(HTTP_PORT, () => {
          console.log(`🔓 HTTP redirect server running on port ${HTTP_PORT}`);
        });
      }
    } else {
      // Create regular HTTP server
      server = http.createServer(app);
      console.log("🔓 HTTP mode enabled");
    }

    // Initialize Socket.IO with the server
    io = socketIo(server, {
      cors: {
        origin: useHTTPS
          ? [
              `https://localhost:${HTTPS_PORT}`,
              `https://127.0.0.1:${HTTPS_PORT}`,
            ]
          : [`http://localhost:${HTTP_PORT}`, `http://127.0.0.1:${HTTP_PORT}`],
        methods: ["GET", "POST"],
        credentials: true,
      },
    });

    // Set up Socket.IO event handlers (existing socket code will go here)
    setupSocketHandlers();

    const actualPort = useHTTPS ? HTTPS_PORT : HTTP_PORT;

    if (process.env.NODE_ENV !== "test") {
      server.listen(actualPort, () => {
        const serverURL = sslManager.getServerURL(actualPort);
        logger.logger.info(`🚀 Server running on ${serverURL}`);
        logger.logger.info(
          `Environment: ${process.env.NODE_ENV || "development"}`
        );
        logger.logger.info(`SSL Status: ${useHTTPS ? "ENABLED" : "DISABLED"}`);

        if (useHTTPS && process.env.NODE_ENV !== "production") {
          logger.logger.warn(
            "⚠️  Using self-signed certificate - browser will show security warning"
          );
          logger.logger.info(
            '💡 To bypass: Click "Advanced" → "Proceed to localhost (unsafe)"'
          );
        }
      });
    }
  } catch (error) {
    console.error("❌ Server initialization error:", error);
    process.exit(1);
  }
}

// Socket.IO event handlers setup
function setupSocketHandlers() {
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
          `User ${socket.currentUserId} (${socket.id}) left team ${teamId}`
        );

        // Send initial summary
        const summary = await computeOrganiserSummary(organiserId);
        socket.emit("dashboardSummary", summary);
      } catch (e) {
        logger.logger.error("Error in registerOrganiser:", e);
      }
    });

    // Register member listener
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
        logger.logger.error("Error in registerMember:", e);
      }
    });

    // Handle joining team rooms
    socket.on("join team", async (data) => {
      try {
        const { teamId, userId } = data;
        if (!teamId || !userId) return;

        // Join the team room
        socket.join(`team-${teamId}`);
        socket.currentTeam = teamId;
        socket.currentUserId = userId;
      // Broadcast message to team
      socket.to(`team-${data.teamId}`).emit("new message", data);
      logger.logger.info(
        `Message sent in team ${data.teamId}: ${data.content}`
      );
    } catch (error) {
      logger.logger.error(`Error updating user lastSeen for message:`, error);
    }
  });

        // Redis room management
        await onlineUsers.joinRoom(userId, `team-${teamId}`);

        // Track online users for this team
        if (!teamUsers.has(teamId)) {
          teamUsers.set(teamId, new Set());
        }
        teamUsers.get(teamId).add(userId);

        // Notify team of user joining
        socket.to(`team-${teamId}`).emit("user joined", {
          userId,
          teamId,
          timestamp: new Date(),
        });

        // Update online count
        updateOnlineCount(teamId);

        logger.logger.info(`User ${userId} joined team ${teamId}`);
      } catch (error) {
        logger.logger.error("Error joining team:", error);
      }
    });

    // Handle leaving team rooms
    socket.on("leave team", async (data) => {
      try {
        const { teamId, userId } = data;
        if (!teamId || !userId) return;

        // Leave the team room
        socket.leave(`team-${teamId}`);

        // Redis room management
        await onlineUsers.leaveRoom(userId, `team-${teamId}`);

        // Remove from team users tracking
        removeUserFromTeam(teamId, userId);

        // Notify team of user leaving
        socket.to(`team-${teamId}`).emit("user left", {
          userId,
          teamId,
          timestamp: new Date(),
        });

        // Update online count
        updateOnlineCount(teamId);

        logger.logger.info(`User ${userId} left team ${teamId}`);
      } catch (error) {
        logger.logger.error("Error leaving team:", error);
      }
    });

    // Handle message sending
    socket.on("send message", async (data) => {
      try {
        const { teamId, message, userId } = data;
        if (!teamId || !message || !userId) return;

        // Cache message in Redis
        await messageCache.addMessage(teamId, {
          ...message,
          timestamp: new Date(),
        });

        // Broadcast to team members
        socket.to(`team-${teamId}`).emit("new message", {
          teamId,
          message,
          userId,
          timestamp: new Date(),
        });

        logger.logger.info(`Message sent to team ${teamId} by user ${userId}`);
      } catch (error) {
        logger.logger.error("Error sending message:", error);
      }
    });
    } catch (error) {
      logger.logger.error(`Error updating user lastSeen on disconnect:`, error);
    }
  });
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
      logger.logger.info(`Task updated in team ${data.teamId}`);
    });

    // Handle user status
    socket.on("user status", (data) => {
      socket.to(`team-${data.teamId}`).emit("user status changed", data);
      logger.logger.info(
        `User status changed: ${data.userId} - ${data.status}`
      );
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
            await onlineUsers.leaveRoom(
              socket.currentUserId,
              socket.currentTeam
            );
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
        logger.logger.error(
          "Error updating user lastSeen on disconnect:",
          error
        );
      }
    });
if (process.env.NODE_ENV !== "test") {
  server.listen(PORT, () => {
    console.log(`✓ Server running on port ${PORT}`);
    logger.logger.info(`Server running on port ${PORT}`);
    logger.logger.info(`Environment: ${process.env.NODE_ENV || "development"}`);
  });
}

// Initialize the server with SSL support
initializeServer();

module.exports = {
  app,
  server,
  io,
  emitOrganiserSummary,
};
