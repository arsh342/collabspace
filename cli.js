#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
require("dotenv").config();

// Import models
const User = require("./src/models/User");
const Team = require("./src/models/Team");
const Task = require("./src/models/Task");
const Message = require("./src/models/Message");

// Connect to MongoDB
async function connectDB() {
  try {
    await mongoose.connect(
      process.env.MONGODB_URI || "mongodb://localhost:27017/collabspace"
    );
    console.log("✅ Connected to MongoDB");
  } catch (error) {
    console.error("❌ MongoDB connection error:", error.message);
    process.exit(1);
  }
}

// Disconnect from MongoDB
async function disconnectDB() {
  try {
    await mongoose.disconnect();
    console.log("✅ Disconnected from MongoDB");
  } catch (error) {
    console.error("❌ Error disconnecting from MongoDB:", error.message);
  }
}

// Backup database collections to JSON files
async function backupDatabase() {
  try {
    console.log("🔄 Starting database backup...");

    const backupDir = path.join(__dirname, "backups");
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupPath = path.join(backupDir, `backup-${timestamp}`);
    fs.mkdirSync(backupPath, { recursive: true });

    // Backup Users
    console.log("📊 Backing up users...");
    const users = await User.find({}).lean();
    fs.writeFileSync(
      path.join(backupPath, "users.json"),
      JSON.stringify(users, null, 2)
    );

    // Backup Teams
    console.log("👥 Backing up teams...");
    const teams = await Team.find({}).lean();
    fs.writeFileSync(
      path.join(backupPath, "teams.json"),
      JSON.stringify(teams, null, 2)
    );

    // Backup Tasks
    console.log("📋 Backing up tasks...");
    const tasks = await Task.find({}).lean();
    fs.writeFileSync(
      path.join(backupPath, "tasks.json"),
      JSON.stringify(tasks, null, 2)
    );

    // Backup Messages
    console.log("💬 Backing up messages...");
    const messages = await Message.find({}).lean();
    fs.writeFileSync(
      path.join(backupPath, "messages.json"),
      JSON.stringify(messages, null, 2)
    );

    console.log(`✅ Database backup completed successfully!`);
    console.log(`📁 Backup location: ${backupPath}`);
    console.log(
      `📊 Collections backed up: ${users.length} users, ${teams.length} teams, ${tasks.length} tasks, ${messages.length} messages`
    );
  } catch (error) {
    console.error("❌ Backup failed:", error.message);
    process.exit(1);
  }
}

// Generate and display database statistics
async function showStatistics() {
  try {
    console.log("📊 Generating database statistics...\n");

    // User statistics
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ isActive: true });
    const adminUsers = await User.countDocuments({ role: "admin" });
    const memberUsers = await User.countDocuments({ role: "member" });

    console.log("👥 USER STATISTICS:");
    console.log(`   Total Users: ${totalUsers}`);
    console.log(`   Active Users: ${activeUsers}`);
    console.log(`   Admin Users: ${adminUsers}`);
    console.log(`   Member Users: ${memberUsers}`);
    console.log(`   Inactive Users: ${totalUsers - activeUsers}\n`);

    // Team statistics
    const totalTeams = await Team.countDocuments();
    const publicTeams = await Team.countDocuments({ isPublic: true });
    const privateTeams = await Team.countDocuments({ isPublic: false });
    const activeTeams = await Team.countDocuments({ isActive: true });

    console.log("🏢 TEAM STATISTICS:");
    console.log(`   Total Teams: ${totalTeams}`);
    console.log(`   Public Teams: ${publicTeams}`);
    console.log(`   Private Teams: ${privateTeams}`);
    console.log(`   Active Teams: ${activeTeams}`);
    console.log(`   Inactive Teams: ${totalTeams - activeTeams}\n`);

    // Task statistics
    const totalTasks = await Task.countDocuments();
    const todoTasks = await Task.countDocuments({ status: "todo" });
    const inProgressTasks = await Task.countDocuments({
      status: "in-progress",
    });
    const reviewTasks = await Task.countDocuments({ status: "review" });
    const doneTasks = await Task.countDocuments({ status: "done" });
    const overdueTasks = await Task.countDocuments({
      dueDate: { $lt: new Date() },
      status: { $ne: "done" },
    });

    console.log("📋 TASK STATISTICS:");
    console.log(`   Total Tasks: ${totalTasks}`);
    console.log(`   Todo: ${todoTasks}`);
    console.log(`   In Progress: ${inProgressTasks}`);
    console.log(`   Review: ${reviewTasks}`);
    console.log(`   Done: ${doneTasks}`);
    console.log(`   Overdue: ${overdueTasks}`);
    console.log(
      `   Completion Rate: ${
        totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0
      }%\n`
    );

    // Message statistics
    const totalMessages = await Message.countDocuments();
    const textMessages = await Message.countDocuments({ messageType: "text" });
    const fileMessages = await Message.countDocuments({ messageType: "file" });
    const systemMessages = await Message.countDocuments({
      messageType: "system",
    });

    console.log("💬 MESSAGE STATISTICS:");
    console.log(`   Total Messages: ${totalMessages}`);
    console.log(`   Text Messages: ${textMessages}`);
    console.log(`   File Messages: ${fileMessages}`);
    console.log(`   System Messages: ${systemMessages}\n`);

    // Recent activity
    const recentUsers = await User.find({})
      .sort({ lastLoginAt: -1 })
      .limit(5)
      .select("username firstName lastName lastLoginAt");

    const recentTasks = await Task.find({})
      .sort({ updatedAt: -1 })
      .limit(5)
      .select("title status updatedAt");

    console.log("🕒 RECENT ACTIVITY:");
    console.log("   Recent Logins:");
    recentUsers.forEach((user) => {
      const lastLogin = user.lastLoginAt
        ? new Date(user.lastLoginAt).toLocaleDateString()
        : "Never";
      console.log(
        `     ${user.firstName} ${user.lastName} (${user.username}) - ${lastLogin}`
      );
    });

    console.log("\n   Recent Task Updates:");
    recentTasks.forEach((task) => {
      const updatedAt = new Date(task.updatedAt).toLocaleDateString();
      console.log(`     ${task.title} (${task.status}) - ${updatedAt}`);
    });
  } catch (error) {
    console.error("❌ Error generating statistics:", error.message);
    process.exit(1);
  }
}

// Show help information
function showHelp() {
  console.log(`
🚀 CollabSpace CLI Tool

Usage: node cli.js [command]

Commands:
  --backup, -b    Backup database collections to JSON files
  --stats, -s     Show database statistics and analytics
  --help, -h      Show this help message

Examples:
  node cli.js --backup
  node cli.js --stats
  node cli.js --help

Environment Variables:
  MONGODB_URI     MongoDB connection string (default: mongodb://localhost:27017/collabspace)
  NODE_ENV        Environment (development/production)
`);
}

// Main CLI logic
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    showHelp();
    return;
  }

  try {
    await connectDB();

    if (args.includes("--backup") || args.includes("-b")) {
      await backupDatabase();
    } else if (args.includes("--stats") || args.includes("-s")) {
      await showStatistics();
    } else {
      console.log("❌ Unknown command. Use --help for usage information.");
      process.exit(1);
    }
  } catch (error) {
    console.error("❌ CLI execution failed:", error.message);
    process.exit(1);
  } finally {
    await disconnectDB();
  }
}

// Run CLI if this file is executed directly
if (require.main === module) {
  main().catch((error) => {
    console.error("❌ Unhandled error:", error);
    process.exit(1);
  });
}

module.exports = {
  connectDB,
  disconnectDB,
  backupDatabase,
  showStatistics,
};
