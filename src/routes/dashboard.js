const express = require("express");
const { requireAuth } = require("../middleware/auth");
const { catchAsync } = require("../middleware/errorHandler");
const {
  cacheMiddleware,
  invalidateCacheMiddleware,
} = require("../middleware/cache");
const Team = require("../models/Team");
const Task = require("../models/Task");
const User = require("../models/User");

const router = express.Router();

// @desc    Get dashboard stats (teams, tasks, member counts) for organisers
// @route   GET /api/dashboard/stats
// @access  Private
router.get(
  "/stats",
  requireAuth,
  cacheMiddleware(10, (req) => `dashboard:stats:${req.user._id}`), // Cache for 10 seconds
  catchAsync(async (req, res) => {
    const userId = req.user._id;

    try {
      // Get teams where user is admin
      const teams = await Team.find({ admin: userId })
        .populate("admin", "firstName lastName email")
        .populate("members", "firstName lastName email")
        .sort({ createdAt: 1 });

      // Get tasks for organiser's teams
      const teamIds = teams.map((team) => team._id);
      const tasks = await Task.find({
        $or: [{ createdBy: userId }, { team: { $in: teamIds } }],
      })
        .populate("team", "name")
        .sort({ createdAt: -1 });

      // Get user info
      const user = await User.findById(userId).select(
        "firstName lastName email role createdAt bio"
      );

      // Calculate stats
      const totalTeams = teams.length;

      // Calculate unique members across all teams
      const uniqueMembers = new Set();
      teams.forEach((team) => {
        if (Array.isArray(team.members)) {
          team.members.forEach((member) => {
            const memberId = typeof member === 'object' ? member._id.toString() : member.toString();
            uniqueMembers.add(memberId);
          });
        }
      });
      const totalMembers = uniqueMembers.size;

      const totalTasks = tasks.length;
      const completedTasks = tasks.filter(
        (task) => task.status === "completed"
      ).length;
      const activeTasks = totalTasks - completedTasks; // Active tasks = total - completed
      const completionRate =
        totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

      // Stats calculated

      res.json({
        success: true,
        data: {
          user,
          teams,
          tasks,
          stats: {
            totalTeams,
            totalMembers,
            totalTasks,
            activeTasks,
            completedTasks,
            completionRate,
          },
        },
      });
    } catch (error) {
      console.error("Dashboard stats error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to load dashboard stats",
      });
    }
  })
);

// @desc    Get dashboard updates for real-time notifications
// @route   GET /api/dashboard/updates
// @access  Private
router.get(
  "/updates",
  requireAuth,
  catchAsync(async (req, res) => {
    // Mock real-time updates - in a real app, this would check for actual updates
    const mockUpdates = {
      hasUpdates: false,
      updates: [],
    };

    // Randomly generate some mock updates for testing
    if (Math.random() > 0.8) {
      mockUpdates.hasUpdates = true;
      mockUpdates.updates = [
        {
          type: "new_join_request",
          data: {
            userName: "John Doe",
          },
          timestamp: new Date(),
        },
      ];
    }

    res.json({
      success: true,
      data: mockUpdates,
    });
  })
);

module.exports = router;
