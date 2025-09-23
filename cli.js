#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
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

// Clean up orphaned tasks (tasks without valid teams)
async function cleanupOrphanedTasks() {
  try {
    console.log("🧹 Starting orphaned tasks cleanup...");

    // Find tasks where team reference is invalid
    const orphanedTasks = await Task.aggregate([
      {
        $lookup: {
          from: "teams",
          localField: "team",
          foreignField: "_id",
          as: "teamData"
        }
      },
      {
        $match: {
          teamData: { $size: 0 } // No matching team found
        }
      }
    ]);

    console.log(`Found ${orphanedTasks.length} orphaned tasks`);

    if (orphanedTasks.length > 0) {
      const taskIds = orphanedTasks.map(task => task._id);
      const result = await Task.deleteMany({ _id: { $in: taskIds } });
      
      console.log(`✅ Cleaned up ${result.deletedCount} orphaned tasks`);
      
      // Log details of cleaned tasks
      orphanedTasks.forEach(task => {
        console.log(`   - "${task.title}" (ID: ${task._id})`);
      });
    } else {
      console.log("✅ No orphaned tasks found");
    }

    return orphanedTasks.length;
  } catch (error) {
    console.error("❌ Error cleaning up orphaned tasks:", error.message);
    throw error;
  }
}

// List all teams
async function listTeams() {
  try {
    console.log("🏢 Listing all teams...");
    
    const teams = await Team.find({}).populate('admin', 'username').populate('members', 'username');
    
    if (teams.length === 0) {
      console.log("No teams found in the database.");
      return;
    }
    
    teams.forEach((team, index) => {
      console.log(`\n${index + 1}. Team: ${team.name}`);
      console.log(`   ID: ${team._id}`);
      console.log(`   Type: ${team.type}`);
      console.log(`   Status: ${team.status}`);
      console.log(`   Admin: ${team.admin ? team.admin.username : 'None'}`);
      console.log(`   Members: ${team.members.length} member(s)`);
      if (team.members.length > 0) {
        team.members.forEach(member => {
          console.log(`     - ${member.username}`);
        });
      }
      console.log(`   Created: ${team.createdAt}`);
    });
    
    console.log(`\n✅ Total teams found: ${teams.length}`);
  } catch (error) {
    console.error("❌ Error listing teams:", error.message);
  }
}

// Remove a team by ID
async function removeTeam(teamId) {
  try {
    console.log(`🗑️  Removing team with ID: ${teamId}...`);
    
    // First check if team exists
    const team = await Team.findById(teamId);
    if (!team) {
      console.log("❌ Team not found with the provided ID.");
      return;
    }
    
    console.log(`Found team: ${team.name}`);
    
    // Delete associated tasks
    const deletedTasks = await Task.deleteMany({ team: teamId });
    console.log(`🗑️  Deleted ${deletedTasks.deletedCount} associated tasks`);
    
    // Delete associated messages
    const deletedMessages = await Message.deleteMany({ team: teamId });
    console.log(`🗑️  Deleted ${deletedMessages.deletedCount} associated messages`);
    
    // Delete the team
    await Team.findByIdAndDelete(teamId);
    console.log(`✅ Team "${team.name}" removed successfully`);
    
  } catch (error) {
    console.error("❌ Error removing team:", error.message);
  }
}

// Set a user's password by username
async function setUserPassword(username, newPassword) {
  try {
    if (!username || !newPassword) {
      console.error("❌ Username and new password required");
      process.exit(1);
    }
    const user = await User.findOne({ username });
    if (!user) {
      console.error(`❌ User not found: ${username}`);
      return;
    }
    const hashed = await bcrypt.hash(newPassword, 12);
    user.password = hashed;
    await user.save();
    console.log(`✅ Password updated for user: ${username}`);
  } catch (error) {
    console.error("❌ Error setting password:", error.message);
  }
}

// Show user info by username
async function showUserInfo(username) {
  try {
    if (!username) {
      console.error("❌ Username required");
      process.exit(1);
    }
    const user = await User.findOne({ username }).lean();
    if (!user) {
      console.error(`❌ User not found: ${username}`);
      return;
    }
    console.log(`User Info for '${username}':`);
    console.log(`  Email: ${user.email}`);
    console.log(`  First Name: ${user.firstName}`);
    console.log(`  Last Name: ${user.lastName}`);
    console.log(`  Role: ${user.role}`);
    console.log(`  Active: ${user.isActive}`);
    console.log(`  Last Seen: ${user.lastSeen}`);
  } catch (error) {
    console.error("❌ Error showing user info:", error.message);
  }
}

// Show full user debug info by username
async function showUserDebug(username) {
  try {
    if (!username) {
      console.error("❌ Username required");
      process.exit(1);
    }
    const user = await User.findOne({ username }).select('+password').lean();
    if (!user) {
      console.error(`❌ User not found: ${username}`);
      return;
    }
    console.log(`User Debug Info for '${username}':`);
    console.log(user);
  } catch (error) {
    console.error("❌ Error showing user debug info:", error.message);
  }
}

// Delete user and all related data by username
async function deleteUserAndData(username) {
  try {
    if (!username) {
      console.error("❌ Username required");
      process.exit(1);
    }
    const user = await User.findOne({ username });
    if (!user) {
      console.error(`❌ User not found: ${username}`);
      return;
    }
    // Delete teams where user is admin
    const teams = await Team.find({ admin: user._id });
    for (const team of teams) {
      await Task.deleteMany({ team: team._id });
      await Message.deleteMany({ team: team._id });
      await Team.findByIdAndDelete(team._id);
      console.log(`Deleted team: ${team.name}`);
    }
    // Remove user from other teams' members
    await Team.updateMany({ members: user._id }, { $pull: { members: user._id } });
    // Delete tasks assigned to user
    await Task.deleteMany({ assignee: user._id });
    // Delete messages sent by user
    await Message.deleteMany({ sender: user._id });
    // Delete the user
    await User.findByIdAndDelete(user._id);
    console.log(`✅ Deleted user and all related data for: ${username}`);
  } catch (error) {
    console.error("❌ Error deleting user and data:", error.message);
  }
}

// Show help message
function showHelp() {
  console.log(`
🚀 CollabSpace CLI Tool

Usage: node cli.js [command]

Commands:
  --backup, -b          Backup database collections to JSON files
  --stats, -s           Show database statistics and analytics
  --cleanup, -c         Clean up orphaned tasks (tasks without valid teams)
  --list-teams, -l      List all teams in the database
  --remove-team <id>    Remove a team by ID (with cascade deletion)
  --set-password         Set a user's password by username
  --show-user            Show user info (username, email, etc) for any user
  --show-user-debug      Show full user debug info (including password hash) for any user
  --delete-user          Delete a user and all related data (teams, tasks, messages) by username
  --help, -h            Show this help message

Examples:
  node cli.js --backup
  node cli.js --stats
  node cli.js --cleanup
  node cli.js --list-teams
  node cli.js --remove-team 507f1f77bcf86cd799439011
  node cli.js --set-password john_doe newSecureP@ssw0rd
  node cli.js --show-user john_doe
  node cli.js --show-user-debug john_doe
  node cli.js --delete-user john_doe
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
    } else if (args.includes("--cleanup") || args.includes("-c")) {
      await cleanupOrphanedTasks();
    } else if (args.includes("--list-teams") || args.includes("-l")) {
      await listTeams();
    } else if (args.includes("--remove-team")) {
      const teamIdIndex = args.indexOf("--remove-team");
      const teamId = args[teamIdIndex + 1];
      if (!teamId) {
        console.error("❌ Please provide a team ID");
        process.exit(1);
      }
      await removeTeam(teamId);
    } else if (args.includes("--set-password")) {
      const idx = args.indexOf("--set-password");
      const username = args[idx + 1];
      const newPassword = args[idx + 2];
      if (!username || !newPassword) {
        console.error("❌ Usage: --set-password <username> <newPassword>");
        process.exit(1);
      }
      await setUserPassword(username, newPassword);
    } else if (args.includes("--show-user")) {
      const idx = args.indexOf("--show-user");
      const username = args[idx + 1];
      if (!username) {
        console.error("❌ Usage: --show-user <username>");
        process.exit(1);
      }
      await showUserInfo(username);
    } else if (args.includes("--show-user-debug")) {
      const idx = args.indexOf("--show-user-debug");
      const username = args[idx + 1];
      if (!username) {
        console.error("❌ Usage: --show-user-debug <username>");
        process.exit(1);
      }
      await showUserDebug(username);
    } else if (args.includes("--delete-user")) {
      const idx = args.indexOf("--delete-user");
      const username = args[idx + 1];
      if (!username) {
        console.error("❌ Usage: --delete-user <username>");
        process.exit(1);
      }
      await deleteUserAndData(username);
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
  cleanupOrphanedTasks,
  listTeams,
  removeTeam,
  setUserPassword,
  showUserInfo,
  showUserDebug,
  deleteUserAndData,
};
