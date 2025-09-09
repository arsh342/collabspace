const express = require("express");
const path = require("path");
const http = require("http");
const socketIo = require("socket.io");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
require("dotenv").config();

// Import configurations and middleware
const connectDB = require("./config/database");
const logger = require("./middleware/logger");
const errorHandler = require("./middleware/errorHandler");

// Import routes
const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/users");
const teamRoutes = require("./routes/teams");
const taskRoutes = require("./routes/tasks");
const messageRoutes = require("./routes/messages");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Connect to MongoDB
connectDB();

// Security middleware
app.use(cors());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Custom logging middleware
app.use(logger.loggerMiddleware);

// Static files
app.use("/public", express.static(path.join(__dirname, "public")));

// View engine setup
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/teams", teamRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/messages", messageRoutes);

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

// Handle Chrome DevTools requests silently
app.get("/.well-known/appspecific/com.chrome.devtools.json", (req, res) => {
  res.status(204).send();
});

app.get("/teams", (req, res) => {
  const mockUser = {
    firstName: "John",
    lastName: "Doe",
    role: "admin",
  };
  res.render("teams", {
    title: "Teams - CollabSpace",
    user: mockUser,
    path: "/teams",
  });
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

app.get("/chat", (req, res) => {
  const mockUser = {
    firstName: "John",
    lastName: "Doe",
    role: "admin",
  };
  res.render("chat", {
    title: "Chat - CollabSpace",
    user: mockUser,
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

// Socket.IO connection handling
io.on("connection", (socket) => {
  logger.logger.info(`User connected: ${socket.id}`);

  // Join team room
  socket.on("join team", (data) => {
    socket.join(`team-${data.teamId}`);
    logger.logger.info(`User ${socket.id} joined team ${data.teamId}`);
  });

  // Handle chat messages
  socket.on("send message", (data) => {
    // Broadcast message to team
    socket.to(`team-${data.teamId}`).emit("new message", data);
    logger.logger.info(`Message sent in team ${data.teamId}: ${data.content}`);
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

  socket.on("disconnect", () => {
    logger.logger.info(`User disconnected: ${socket.id}`);
  });
});

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

server.listen(PORT, () => {
  logger.logger.info(`Server running on port ${PORT}`);
  logger.logger.info(`Environment: ${process.env.NODE_ENV || "development"}`);
});

module.exports = app;
