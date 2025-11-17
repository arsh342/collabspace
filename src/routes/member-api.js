const express = require("express");
const router = express.Router();
const { auth } = require("../middleware/auth");
const User = require("../models/User");
const Team = require("../models/Team");
const Task = require("../models/Task");
const Message = require("../models/Message");

// Member Dashboard Stats
router.get("/stats", auth, async (req, res) => {
  try {
    const userId = req.session.userId;

    // Get user's teams
    const userTeams = await Team.find({
      members: userId,
    }).select("_id");

    const teamIds = userTeams.map((team) => team._id);

    // Get member tasks (tasks in their teams only)
    const memberTasks = await Task.find({
      team: { $in: teamIds },
      isArchived: false,
    });

    // Get completed tasks
    const completedTasks = memberTasks.filter(
      (task) => task.status === "completed",
    );

    // Get unread messages count (simplified)
    const unreadMessages = 0; // Simplified for now

    const stats = {
      myTasks: memberTasks.length,
      completedTasks: completedTasks.length,
      myTeams: userTeams.length,
      unreadMessages: unreadMessages,
    };

    // Member stats calculated
    res.json(stats);
  } catch (error) {
    console.error("Error fetching member stats:", error);
    res.status(500).json({ error: "Failed to fetch dashboard stats" });
  }
});

// Get member tasks
router.get("/tasks", auth, async (req, res) => {
  try {
    const userId = req.session.userId;

    // Get user's teams
    const userTeams = await Team.find({
      members: userId,
    }).select("_id");

    const teamIds = userTeams.map((team) => team._id);

    // Get member tasks
    const tasks = await Task.find({
      team: { $in: teamIds },
      isArchived: false,
    })
      .populate("team", "name")
      .populate("createdBy", "firstName lastName")
      .sort({ createdAt: -1 });

    res.json(tasks);
  } catch (error) {
    console.error("Error fetching member tasks:", error);
    res.status(500).json({ error: "Failed to fetch tasks" });
  }
});

// Get member teams
router.get("/teams", auth, async (req, res) => {
  try {
    const userId = req.session.userId;

    const teams = await Team.find({
      members: userId,
    })
      .populate("admin", "firstName lastName email")
      .populate("members", "firstName lastName email")
      .sort({ createdAt: -1 });

    res.json(teams);
  } catch (error) {
    console.error("Error fetching member teams:", error);
    res.status(500).json({ error: "Failed to fetch teams" });
  }
});

// Get member profile
router.get("/profile", auth, async (req, res) => {
  try {
    const userId = req.session.userId;

    const user = await User.findById(userId).select(
      "firstName lastName email username phone avatar bio createdAt",
    );

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(user);
  } catch (error) {
    console.error("Error fetching member profile:", error);
    res.status(500).json({ error: "Failed to fetch profile" });
  }
});

// Update member profile
router.put("/profile", auth, async (req, res) => {
  try {
    const userId = req.session.userId;
    const { firstName, lastName, phone, bio } = req.body;

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        firstName,
        lastName,
        phone,
        bio,
      },
      { new: true, runValidators: true },
    ).select("firstName lastName email username phone avatar bio");

    if (!updatedUser) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(updatedUser);
  } catch (error) {
    console.error("Error updating member profile:", error);
    res.status(500).json({ error: "Failed to update profile" });
  }
});

// Get recent activity for member
router.get("/recent-activity", auth, async (req, res) => {
  try {
    const userId = req.session.userId;

    // Get user's teams
    const userTeams = await Team.find({ members: userId }).select("_id name");
    const teamIds = userTeams.map((team) => team._id);

    // Get recent activities
    const activities = [];

    // Recent tasks
    const recentTasks = await Task.find({
      team: { $in: teamIds },
      createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }, // Last 7 days
    })
      .populate("team", "name")
      .sort({ createdAt: -1 })
      .limit(5);

    recentTasks.forEach((task) => {
      activities.push({
        type: "task",
        icon: "fas fa-tasks",
        text: `New task "${task.title}" in ${task.team.name}`,
        timeAgo: getTimeAgo(task.createdAt),
      });
    });

    // Recent messages
    const recentMessages = await Message.find({
      team: { $in: teamIds },
      createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
    })
      .populate("team", "name")
      .populate("sender", "firstName lastName")
      .sort({ createdAt: -1 })
      .limit(5);

    recentMessages.forEach((message) => {
      activities.push({
        type: "message",
        icon: "fas fa-comment",
        text: `${message.sender.firstName} ${message.sender.lastName} sent a message in ${message.team.name}`,
        timeAgo: getTimeAgo(message.createdAt),
      });
    });

    // Sort by date and limit
    activities.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json(activities.slice(0, 8));
  } catch (error) {
    console.error("Error fetching recent activity:", error);
    res.status(500).json({ error: "Failed to fetch recent activity" });
  }
});

// Get upcoming deadlines
router.get("/upcoming-deadlines", auth, async (req, res) => {
  try {
    const userId = req.session.userId;

    // Get user's teams
    const userTeams = await Team.find({ members: userId }).select("_id");
    const teamIds = userTeams.map((team) => team._id);

    // Get tasks with due dates
    const upcomingTasks = await Task.find({
      team: { $in: teamIds },
      dueDate: { $exists: true, $gte: new Date() },
      status: { $ne: "completed" },
      isArchived: false,
    })
      .populate("team", "name")
      .sort({ dueDate: 1 })
      .limit(5);

    const deadlines = upcomingTasks.map((task) => {
      const now = new Date();
      const dueDate = new Date(task.dueDate);
      const daysUntilDue = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));

      let urgency = "normal";
      if (daysUntilDue <= 1) urgency = "urgent";
      else if (daysUntilDue <= 3) urgency = "warning";

      return {
        title: task.title,
        team: task.team.name,
        dueDate: formatDate(task.dueDate),
        urgency: urgency,
      };
    });

    res.json(deadlines);
  } catch (error) {
    console.error("Error fetching deadlines:", error);
    res.status(500).json({ error: "Failed to fetch deadlines" });
  }
});

// Get progress data
router.get("/progress", auth, async (req, res) => {
  try {
    const userId = req.session.userId;

    // Get user's teams
    const userTeams = await Team.find({ members: userId }).select("_id");
    const teamIds = userTeams.map((team) => team._id);

    // Get all tasks in user's teams
    const allTasks = await Task.find({
      team: { $in: teamIds },
      isArchived: false,
    });

    const completedTasks = allTasks.filter(
      (task) => task.status === "completed",
    ).length;
    const totalTasks = allTasks.length;

    // Calculate team participation (simplified)
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);

    const weeklyMessages = await Message.find({
      team: { $in: teamIds },
      sender: userId,
      createdAt: { $gte: weekStart },
    }).countDocuments();

    const teamParticipation = Math.min(
      100,
      Math.round((weeklyMessages / 10) * 100),
    ); // Cap at 100%

    res.json({
      completedTasks,
      totalTasks,
      teamParticipation,
    });
  } catch (error) {
    console.error("Error fetching progress:", error);
    res.status(500).json({ error: "Failed to fetch progress" });
  }
});

// Get team highlights
router.get("/team-highlights", auth, async (req, res) => {
  try {
    const userId = req.session.userId;

    // Get user's teams
    const userTeams = await Team.find({ members: userId })
      .populate("members", "firstName lastName")
      .sort({ createdAt: -1 });

    const highlights = [];

    for (const team of userTeams.slice(0, 3)) {
      // Limit to 3 highlights
      const recentTasks = await Task.find({
        team: team._id,
        status: "completed",
        updatedAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      }).countDocuments();

      if (recentTasks > 0) {
        highlights.push({
          icon: "fas fa-trophy",
          title: `${team.name} Progress`,
          description: `Completed ${recentTasks} task${
            recentTasks > 1 ? "s" : ""
          } this week!`,
        });
      } else {
        highlights.push({
          icon: "fas fa-users",
          title: team.name,
          description: `Active team with ${team.members.length} member${
            team.members.length > 1 ? "s" : ""
          }`,
        });
      }
    }

    // Add a general highlight if no teams
    if (highlights.length === 0) {
      highlights.push({
        icon: "fas fa-star",
        title: "Getting Started",
        description: "Join teams to see achievements and highlights here!",
      });
    }

    res.json(highlights);
  } catch (error) {
    console.error("Error fetching team highlights:", error);
    res.status(500).json({ error: "Failed to fetch team highlights" });
  }
});

// Get quick stats
router.get("/quick-stats", auth, async (req, res) => {
  try {
    const userId = req.session.userId;

    // Get user's teams
    const userTeams = await Team.find({ members: userId }).select("_id");
    const teamIds = userTeams.map((team) => team._id);

    // Calculate day streak (simplified - days since last activity)
    const lastActivity = await Message.findOne({
      sender: userId,
      team: { $in: teamIds },
    }).sort({ createdAt: -1 });

    let dayStreak = 0;
    if (lastActivity) {
      const daysSinceActivity = Math.floor(
        (new Date() - lastActivity.createdAt) / (1000 * 60 * 60 * 24),
      );
      dayStreak = Math.max(0, 7 - daysSinceActivity); // Simple streak calculation
    }

    // Count achievements (completed tasks as achievements)
    const achievements = await Task.find({
      team: { $in: teamIds },
      status: "completed",
    }).countDocuments();

    // Average response time (simplified)
    const averageResponseTime = Math.floor(Math.random() * 4) + 1; // 1-4 hours (placeholder)

    // Helpful rating (simplified)
    const helpfulRating = 4.2 + Math.random() * 0.8; // 4.2-5.0 range

    res.json({
      dayStreak,
      achievements,
      averageResponseTime,
      helpfulRating,
    });
  } catch (error) {
    console.error("Error fetching quick stats:", error);
    res.status(500).json({ error: "Failed to fetch quick stats" });
  }
});

// Helper functions
function getTimeAgo(date) {
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) return `${diffMins} minutes ago`;
  if (diffHours < 24) return `${diffHours} hours ago`;
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString();
}

function formatDate(date) {
  const options = { month: "short", day: "numeric" };
  return new Date(date).toLocaleDateString("en-US", options);
}

module.exports = router;
