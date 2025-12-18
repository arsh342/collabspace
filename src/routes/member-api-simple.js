const express = require("express");
const router = express.Router();
const { authenticateSession } = require("../middleware/auth");
const {
  cacheMiddleware,
  invalidateCacheMiddleware,
} = require("../middleware/cache");
const User = require("../models/User");
const Team = require("../models/Team");
const Task = require("../models/Task");

// Simple test route
router.get("/test", (req, res) => {
  res.json({ message: "Member API working" });
});

// Member Dashboard Stats - Use client-side caching
router.get("/stats", authenticateSession, async (req, res) => {
  try {
    // Set headers for client-side caching
    res.setHeader("Cache-Control", "private, max-age=180"); // 3 minutes
    res.setHeader("X-Cache-Strategy", "client-side");
    res.setHeader("X-Cache-Category", "dashboard");

    const userId = req.session.userId;

    // Get user's teams
    const userTeams = await Team.find({
      members: userId,
    }).select("_id");

    const teamIds = userTeams.map((team) => team._id);

    // Get member tasks (tasks in their teams)
    const memberTasks = await Task.find({
      team: { $in: teamIds },
      isArchived: false,
    });

    // Get completed tasks
    const completedTasks = memberTasks.filter(
      (task) => task.status === "completed"
    );

    const stats = {
      myTasks: memberTasks.length,
      completedTasks: completedTasks.length,
      myTeams: userTeams.length,
      unreadMessages: 0, // Simplified for now
    };

    console.log("Member stats calculated:", stats);
    res.json(stats);
  } catch (error) {
    console.error("Error fetching member stats:", error);
    res.status(500).json({ error: "Failed to fetch dashboard stats" });
  }
});

// Get member tasks
router.get("/tasks", authenticateSession, async (req, res) => {
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
router.get("/teams", authenticateSession, async (req, res) => {
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
router.get("/profile", authenticateSession, async (req, res) => {
  try {
    const userId = req.session.userId;

    const user = await User.findById(userId).select(
      "firstName lastName email username phone avatar bio createdAt"
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
router.put("/profile", authenticateSession, async (req, res) => {
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
      { new: true, runValidators: true }
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
router.get("/recent-activity", authenticateSession, async (req, res) => {
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

    // Sort by date and limit
    activities.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json(activities.slice(0, 8));
  } catch (error) {
    console.error("Error fetching recent activity:", error);
    res.status(500).json({ error: "Failed to fetch recent activity" });
  }
});

// Get upcoming deadlines
router.get("/upcoming-deadlines", authenticateSession, async (req, res) => {
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
router.get("/progress", authenticateSession, async (req, res) => {
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
      (task) => task.status === "completed"
    ).length;
    const totalTasks = allTasks.length;

    // Calculate team participation (simplified)
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);

    // For now, use a simple calculation based on task activity
    const weeklyTasksCompleted = await Task.find({
      team: { $in: teamIds },
      status: "completed",
      updatedAt: { $gte: weekStart },
    }).countDocuments();

    const teamParticipation = Math.min(
      100,
      Math.round((weeklyTasksCompleted / 5) * 100)
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
router.get("/team-highlights", authenticateSession, async (req, res) => {
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
router.get("/quick-stats", authenticateSession, async (req, res) => {
  try {
    const userId = req.session.userId;

    // Get user's teams
    const userTeams = await Team.find({ members: userId }).select("_id");
    const teamIds = userTeams.map((team) => team._id);

    // Calculate day streak (simplified - based on recent task activity)
    const recentActivity = await Task.find({
      team: { $in: teamIds },
      updatedAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
    }).countDocuments();

    const dayStreak = Math.min(7, recentActivity); // Simple streak based on activity

    // Count achievements (completed tasks as achievements)
    const achievements = await Task.find({
      team: { $in: teamIds },
      status: "completed",
    }).countDocuments();

    // Average response time (simplified - based on team size)
    const totalMembers = userTeams.reduce(
      (sum, team) => sum + (team.members?.length || 0),
      0
    );
    const averageResponseTime =
      totalMembers > 0 ? Math.max(1, Math.floor(12 / totalMembers)) : 2;

    // Helpful rating (simplified - based on completion rate)
    const allTasks = await Task.find({
      team: { $in: teamIds },
    }).countDocuments();
    const completedTasks = await Task.find({
      team: { $in: teamIds },
      status: "completed",
    }).countDocuments();
    const completionRate = allTasks > 0 ? completedTasks / allTasks : 0;
    const helpfulRating = 3.5 + completionRate * 1.5; // 3.5-5.0 range

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
