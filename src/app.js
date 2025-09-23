const express = require("express");
const path = require("path");
const http = require("http");
const socketIo = require("socket.io");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const session = require("express-session");
const MongoStore = require("connect-mongo");
require("dotenv").config();

// Import configurations and middleware
const connectDB = require("./config/database");
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

const app = express();
const server = http.createServer(app);
const io = socketIo(server);
// In-memory map organiserId -> Set of socket ids
const organiserSockets = new Map();
const { computeOrganiserSummary } = require("./utils/dashboardSummary");

// Connect to MongoDB
connectDB();

// Security middleware
app.use(cors());

// Apply rate limiting
app.use("/api/", apiLimiter); // General API rate limiting

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Session configuration
app.use(
  session({
    secret:
      process.env.SESSION_SECRET ||
      "your-fallback-secret-key-change-in-production",
    resave: false,
    saveUninitialized: false,
    name: "connect.sid", // Explicitly set session name
    store: MongoStore.create({
      mongoUrl:
        process.env.MONGODB_URI || "mongodb://localhost:27017/collabspace",
    }),
    cookie: {
      secure: false, // Allow HTTP for development (VS Code browser)
      httpOnly: false, // Allow JS access for debugging
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: "lax", // More permissive for embedded browsers
    },
  })
);

// Custom logging middleware
app.use(logger.loggerMiddleware);

// Static files
app.use("/public", express.static(path.join(__dirname, "public")));

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

// Frontend Routes
app.get("/", (req, res) => {
  res.render("index", {
    title: "CollabSpace - Team Collaboration Platform",
    user: null,
  });
});

app.get("/register", (req, res) => {
  res.render("register", {
    title: "Register - CollabSpace",
    user: null,
  });
});

app.get("/login", (req, res) => {
  res.render("login", {
    title: "Login - CollabSpace",
    user: null,
  });
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
  res.render("dashboard", {
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
    res.render("organiser-dashboard", {
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
  res.render("member-dashboard", {
    title: "Team Member Dashboard",
    user: req.user,
    path: "/member-dashboard",
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
  res.render("settings", {
    title: "Settings - CollabSpace",
    user: mockUser,
    path: "/settings",
  });
});

// Additional static pages routes
app.get("/enterprise", (req, res) => {
  res.render("enterprise", {
    title: "Enterprise - CollabSpace",
    path: "/enterprise",
  });
});

app.get("/contact", (req, res) => {
  res.render("contact", {
    title: "Contact Us - CollabSpace",
    path: "/contact",
  });
});

app.get("/privacy", (req, res) => {
  res.render("privacy", {
    title: "Privacy Policy - CollabSpace",
    path: "/privacy",
  });
});

app.get("/terms", (req, res) => {
  res.render("terms", {
    title: "Terms of Service - CollabSpace",
    path: "/terms",
  });
});

app.get("/payment", (req, res) => {
  res.render("payment", {
    title: "Payment - CollabSpace",
    path: "/payment",
  });
});

app.get("/help", (req, res) => {
  res.render("help", {
    title: "Help Center - CollabSpace",
    path: "/help",
  });
});

app.get("/security", (req, res) => {
  res.render("security", {
    title: "Security - CollabSpace",
    path: "/security",
  });
});

app.get("/docs", (req, res) => {
  res.render("docs", {
    title: "Documentation - CollabSpace",
    path: "/docs",
  });
});

app.get("/api", (req, res) => {
  res.render("api", {
    title: "API Documentation - CollabSpace",
    path: "/api",
  });
});

app.get("/status", (req, res) => {
  res.render("status", {
    title: "System Status - CollabSpace",
    path: "/status",
  });
});

app.get("/careers", (req, res) => {
  res.render("careers", {
    title: "Careers - CollabSpace",
    path: "/careers",
  });
});

app.get("/blog", (req, res) => {
  res.render("blog", {
    title: "Blog - CollabSpace",
    path: "/blog",
  });
});

app.get("/guides", (req, res) => {
  res.render("guides", {
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
      if (!organiserSockets.has(organiserId)) {
        organiserSockets.set(organiserId, new Set());
      }
      organiserSockets.get(organiserId).add(socket.id);

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

      // Leave previous team if any
      if (socket.currentTeam && socket.currentUserId) {
        socket.leave(`team-${socket.currentTeam}`);
        removeUserFromTeam(socket.currentTeam, socket.currentUserId);
        updateOnlineCount(socket.currentTeam);
      }

      // Join new team
      socket.join(`team-${teamId}`);
      socket.currentTeam = teamId;
      socket.currentUserId = userId;

      // Track user in team
      if (!teamUsers.has(teamId)) {
        teamUsers.set(teamId, new Set());
      }
      teamUsers.get(teamId).add(userId);

      logger.logger.info(`User ${userId} (${socket.id}) joined team ${teamId}`);

      // Update online count for this team
      updateOnlineCount(teamId);
    } catch (error) {
      logger.logger.error(`Error updating user lastSeen for ${userId}:`, error);
    }
  });

  // Leave team room
  socket.on("leave team", (data) => {
    const { teamId } = data;

    try {
      if (socket.currentTeam === teamId && socket.currentUserId) {
        socket.leave(`team-${teamId}`);
        removeUserFromTeam(teamId, socket.currentUserId);
        updateOnlineCount(teamId);

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
      // Update user's lastSeen timestamp
      if (data.userId) {
        await User.findByIdAndUpdate(data.userId, { lastSeen: new Date() });
      }

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

// Export helper so routes can trigger emits
module.exports.emitOrganiserSummary = emitOrganiserSummary;
module.exports.io = io;

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

const PORT = process.env.PORT || 3003;

server.listen(PORT, () => {
  logger.logger.info(`Server running on port ${PORT}`);
  logger.logger.info(`Environment: ${process.env.NODE_ENV || "development"}`);
});

module.exports = app;
