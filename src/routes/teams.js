const express = require("express");
const { body, validationResult } = require("express-validator");
const Team = require("../models/Team");
const User = require("../models/User");
const { catchAsync, AppError } = require("../middleware/errorHandler");
const {
  requireAuth,
  requireOrganiser,
  requireTeamMembership,
  requireTeamOrganiser,
} = require("../middleware/auth");
const { logger } = require("../middleware/logger");
const {
  cacheMiddleware,
  invalidateCacheMiddleware,
  invalidateUserCache,
  invalidateTeamCache,
} = require("../middleware/cache");

const router = express.Router();

// Validation middleware
const validateTeamCreation = [
  body("name")
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("Team name must be between 2 and 100 characters"),
  body("description")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Team description cannot exceed 500 characters"),
  body("isPublic")
    .optional()
    .isBoolean()
    .withMessage("isPublic must be a boolean value"),
  body("tags").optional().isArray().withMessage("Tags must be an array"),
  body("tags.*")
    .optional()
    .trim()
    .isLength({ min: 1, max: 20 })
    .withMessage("Each tag must be between 1 and 20 characters"),
];

const validateTeamUpdate = [
  body("name")
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("Team name must be between 2 and 100 characters"),
  body("description")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Team description cannot exceed 500 characters"),
  body("isPublic")
    .optional()
    .isBoolean()
    .withMessage("isPublic must be a boolean value"),
  body("tags").optional().isArray().withMessage("Tags must be an array"),
  body("tags.*")
    .optional()
    .trim()
    .isLength({ min: 1, max: 20 })
    .withMessage("Each tag must be between 1 and 20 characters"),
];

const validateInvitation = [
  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Please provide a valid email address"),
  body("message")
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage("Invitation message cannot exceed 200 characters"),
];

// @route   GET /api/teams
// @desc    Get user's teams
// @access  Private
router.get(
  "/",
  requireAuth,
  catchAsync(async (req, res) => {
    try {
      // Disable caching for teams data to ensure fresh data
      res.set({
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      });

      const { page = 1, limit = 20, search, isActive, admin } = req.query;

      const query = { isActive: true };

      if (search) {
        query.$or = [
          { name: { $regex: search, $options: "i" } },
          { description: { $regex: search, $options: "i" } },
          { tags: { $in: [new RegExp(search, "i")] } },
        ];
      }

      // Filter by admin role if requested
      if (admin === "true") {
        query.admin = req.user._id;
      } else {
        // Default: get teams where user is a member
        query.members = req.user._id;
      }

      const skip = (page - 1) * limit;

      const userTeams = await Team.find(query)
        .populate("admin", "username firstName lastName avatar")
        .populate("members", "username firstName lastName avatar")
        .populate("joinRequests.user", "username firstName lastName avatar")
        .sort({ createdAt: 1 })
        .skip(skip)
        .limit(parseInt(limit));

      const total = await Team.countDocuments(query);

      res.json({
        success: true,
        data: {
          teams: userTeams,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / limit),
          },
        },
      });
    } catch (error) {
      console.error("Get user teams error:", error);
      throw new AppError("Failed to get teams", 500);
    }
  }),
);

// @route   GET /api/teams/public
// @desc    Get public teams
// @access  Private
router.get(
  "/public",
  requireAuth,
  catchAsync(async (req, res) => {
    try {
      const { page = 1, limit = 20, search } = req.query;

      const query = { isPublic: true, isActive: true };

      if (search) {
        query.$or = [
          { name: { $regex: search, $options: "i" } },
          { description: { $regex: search, $options: "i" } },
          { tags: { $in: [new RegExp(search, "i")] } },
        ];
      }

      const skip = (page - 1) * limit;

      const publicTeams = await Team.find(query)
        .populate("admin", "username firstName lastName avatar")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));

      const total = await Team.countDocuments(query);

      res.json({
        success: true,
        data: {
          teams: publicTeams,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / limit),
          },
        },
      });
    } catch (error) {
      logger.error("Get public teams error:", error);
      throw new AppError("Failed to get public teams", 500);
    }
  }),
);

// @route   POST /api/teams
// @desc    Create a new team
// @access  Private
router.post(
  "/",
  requireAuth,
  validateTeamCreation,
  invalidateCacheMiddleware(["user-*", "teams-*", "stats-*"]),
  catchAsync(async (req, res) => {
    try {
      // Freemium: limit free users to 3 active teams as admin
      const isPro =
        req.user?.isPro === true ||
        (req.user?.plan && req.user.plan.toLowerCase() === "pro");
      if (!isPro) {
        const adminTeamsCount = await Team.countDocuments({
          admin: req.user._id,
          isActive: true,
        });
        if (adminTeamsCount >= 3) {
          return res.status(402).json({
            success: false,
            message:
              "Free plan limit reached. Upgrade to Pro to create more than 3 teams.",
            action: {
              type: "upgrade_required",
              url: "/payment",
              currentTeams: adminTeamsCount,
              limit: 3,
            },
          });
        }
      }

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: errors.array(),
        });
      }

      const { name, description, isPublic = false, tags = [] } = req.body;

      // Check if team name already exists for this user
      const existingTeam = await Team.findOne({
        name,
        admin: req.user._id,
      });

      if (existingTeam) {
        return res.status(400).json({
          success: false,
          message: "You already have a team with this name",
        });
      }

      // Create new team
      const team = new Team({
        name,
        description,
        admin: req.user._id,
        members: [req.user._id], // Admin is automatically a member
        isPublic,
        tags,
      });

      await team.save();

      // Populate team data for response
      await team.populate("admin", "username firstName lastName avatar");
      await team.populate("members", "username firstName lastName avatar");

      logger.info(`User ${req.user.username} created team: ${name}`);

      // Emit updated organiser summary (lazy require to avoid circular)
      try {
        const { emitOrganiserSummary } = require("../app");
        emitOrganiserSummary && emitOrganiserSummary(req.user._id.toString());
      } catch (e) {
        logger.warn("Failed to emit organiser summary after team create");
      }

      res.status(201).json({
        success: true,
        message: "Team created successfully",
        data: { team },
      });
    } catch (error) {
      logger.error("Create team error:", error);
      throw new AppError("Failed to create team", 500);
    }
  }),
);

// @route   GET /api/teams/:id
// @desc    Get team details
// @access  Private (Team Member)
router.get(
  "/:id",
  requireTeamMembership,
  catchAsync(async (req, res) => {
    try {
      const team = await Team.findById(req.params.id)
        .populate("admin", "username firstName lastName avatar")
        .populate("members", "username firstName lastName avatar")
        .populate("invitedUsers.user", "username firstName lastName avatar")
        .populate(
          "invitedUsers.invitedBy",
          "username firstName lastName avatar",
        );

      if (!team) {
        return res.status(404).json({
          success: false,
          message: "Team not found",
        });
      }

      res.json({
        success: true,
        data: { team },
      });
    } catch (error) {
      logger.error("Get team details error:", error);
      throw new AppError("Failed to get team details", 500);
    }
  }),
);

// @route   PUT /api/teams/:id
// @desc    Update team
// @access  Private (Team Admin)
router.put(
  "/:id",
  requireTeamOrganiser,
  validateTeamUpdate,
  invalidateCacheMiddleware(["team-*", "teams-*", "stats-*"]),
  catchAsync(async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: errors.array(),
        });
      }

      const { name, description, isPublic, tags } = req.body;

      // Check if team name already exists for this user (if name is being changed)
      if (name && name !== req.team.name) {
        const existingTeam = await Team.findOne({
          name,
          admin: req.user._id,
          _id: { $ne: req.params.id },
        });

        if (existingTeam) {
          return res.status(400).json({
            success: false,
            message: "You already have a team with this name",
          });
        }
      }

      const updateData = { name, description, isPublic, tags };

      // Remove undefined fields
      Object.keys(updateData).forEach(
        (key) => updateData[key] === undefined && delete updateData[key],
      );

      const team = await Team.findByIdAndUpdate(req.params.id, updateData, {
        new: true,
        runValidators: true,
      })
        .populate("admin", "username firstName lastName avatar")
        .populate("members", "username firstName lastName avatar");

      logger.info(`User ${req.user.username} updated team: ${team.name}`);

      res.json({
        success: true,
        message: "Team updated successfully",
        data: { team },
      });
    } catch (error) {
      logger.error("Update team error:", error);
      throw new AppError("Failed to update team", 500);
    }
  }),
);

// @route   DELETE /api/teams/:id
// @desc    Delete team
// @access  Private (Team Admin)
router.delete(
  "/:id",
  requireTeamOrganiser,
  invalidateCacheMiddleware(["team-*", "teams-*", "user-*", "stats-*"]),
  catchAsync(async (req, res) => {
    try {
      const teamName = req.team.name;
      const teamId = req.params.id;

      // Delete all tasks associated with this team first
      const Task = require("../models/Task");
      const deletedTasks = await Task.find({ team: teamId });
      const taskCount = deletedTasks.length;

      if (taskCount > 0) {
        await Task.deleteMany({ team: teamId });
        logger.info(
          `Deleted ${taskCount} tasks associated with team: ${teamName}`,
        );
      }

      // Delete all messages associated with this team
      const Message = require("../models/Message");
      const deletedMessages = await Message.find({ team: teamId });
      const messageCount = deletedMessages.length;

      if (messageCount > 0) {
        await Message.deleteMany({ team: teamId });
        logger.info(
          `Deleted ${messageCount} messages associated with team: ${teamName}`,
        );
      }

      // Finally delete the team
      await Team.findByIdAndDelete(teamId);

      logger.info(
        `User ${req.user.username} deleted team: ${teamName} (and ${taskCount} tasks, ${messageCount} messages)`,
      );

      res.json({
        success: true,
        message: `Team deleted successfully along with ${taskCount} tasks and ${messageCount} messages`,
      });
    } catch (error) {
      logger.error("Delete team error:", error);
      throw new AppError("Failed to delete team", 500);
    }
  }),
);

// @route   POST /api/teams/:id/invite
// @desc    Invite user to team
// @access  Private (Team Member)
router.post(
  "/:id/invite",
  requireTeamMembership,
  validateInvitation,
  catchAsync(async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: errors.array(),
        });
      }

      const { email, message } = req.body;

      // Find user by email
      const userToInvite = await User.findOne({ email });

      if (!userToInvite) {
        return res.status(404).json({
          success: false,
          message: "User not found with this email address",
        });
      }

      // Check if user is already a member
      if (req.team.members.includes(userToInvite._id)) {
        return res.status(400).json({
          success: false,
          message: "User is already a member of this team",
        });
      }

      // Check if user is already invited
      const existingInvite = req.team.invitedUsers.find(
        (invite) => invite.user.toString() === userToInvite._id.toString(),
      );

      if (existingInvite) {
        return res.status(400).json({
          success: false,
          message: "User has already been invited to this team",
        });
      }

      // Send invitation
      await req.team.inviteUser(userToInvite._id, req.user._id);

      // Populate team data for response
      await req.team.populate(
        "invitedUsers.user",
        "username firstName lastName avatar",
      );

      logger.info(
        `User ${req.user.username} invited ${userToInvite.username} to team: ${req.team.name}`,
      );

      res.json({
        success: true,
        message: "Invitation sent successfully",
        data: { team: req.team },
      });
    } catch (error) {
      logger.error("Send team invitation error:", error);
      throw new AppError("Failed to send invitation", 500);
    }
  }),
);

// @route   POST /api/teams/:id/join
// @desc    Join team (for public teams)
// @access  Private
router.post(
  "/:id/join",
  catchAsync(async (req, res) => {
    try {
      const team = await Team.findById(req.params.id);

      if (!team) {
        return res.status(404).json({
          success: false,
          message: "Team not found",
        });
      }

      if (!team.isPublic) {
        return res.status(403).json({
          success: false,
          message: "This team is not public and requires an invitation to join",
        });
      }

      if (team.members.includes(req.user._id)) {
        return res.status(400).json({
          success: false,
          message: "You are already a member of this team",
        });
      }

      // Add user to team
      await team.addMember(req.user._id);

      // Populate team data for response
      await team.populate("admin", "username firstName lastName avatar");
      await team.populate("members", "username firstName lastName avatar");

      logger.info(`User ${req.user.username} joined public team: ${team.name}`);

      res.json({
        success: true,
        message: "Successfully joined team",
        data: { team },
      });
    } catch (error) {
      logger.error("Join team error:", error);
      throw new AppError("Failed to join team", 500);
    }
  }),
);

// @route   POST /api/teams/:id/accept-invitation
// @desc    Accept team invitation
// @access  Private
router.post(
  "/:id/accept-invitation",
  catchAsync(async (req, res) => {
    try {
      const team = await Team.findById(req.params.id);

      if (!team) {
        return res.status(404).json({
          success: false,
          message: "Team not found",
        });
      }

      // Accept invitation
      await team.acceptInvitation(req.user._id);

      // Populate team data for response
      await team.populate("admin", "username firstName lastName avatar");
      await team.populate("members", "username firstName lastName avatar");

      logger.info(
        `User ${req.user.username} accepted invitation to team: ${team.name}`,
      );

      res.json({
        success: true,
        message: "Successfully joined team",
        data: { team },
      });
    } catch (error) {
      logger.error("Accept team invitation error:", error);
      throw new AppError("Failed to accept invitation", 500);
    }
  }),
);

// @route   POST /api/teams/:id/decline-invitation
// @desc    Decline team invitation
// @access  Private
router.post(
  "/:id/decline-invitation",
  catchAsync(async (req, res) => {
    try {
      const team = await Team.findById(req.params.id);

      if (!team) {
        return res.status(404).json({
          success: false,
          message: "Team not found",
        });
      }

      // Decline invitation
      await team.declineInvitation(req.user._id);

      logger.info(
        `User ${req.user.username} declined invitation to team: ${team.name}`,
      );

      res.json({
        success: true,
        message: "Invitation declined successfully",
      });
    } catch (error) {
      logger.error("Decline team invitation error:", error);
      throw new AppError("Failed to decline invitation", 500);
    }
  }),
);

// @route   POST /api/teams/:id/leave
// @desc    Leave team
// @access  Private (Team Member)
router.post(
  "/:id/leave",
  requireTeamMembership,
  catchAsync(async (req, res) => {
    try {
      // Check if user is the admin
      if (req.team.admin.toString() === req.user._id.toString()) {
        return res.status(400).json({
          success: false,
          message:
            "Team admin cannot leave the team. Transfer admin role or delete the team instead.",
        });
      }

      // Remove user from team
      await req.team.removeMember(req.user._id);

      logger.info(`User ${req.user.username} left team: ${req.team.name}`);

      res.json({
        success: true,
        message: "Successfully left team",
      });
    } catch (error) {
      logger.error("Leave team error:", error);
      throw new AppError("Failed to leave team", 500);
    }
  }),
);

// @route   POST /api/teams/:id/remove-member
// @desc    Remove member from team
// @access  Private (Team Admin)
router.post(
  "/:id/remove-member",
  requireTeamOrganiser,
  catchAsync(async (req, res) => {
    try {
      const { userId } = req.body;

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: "User ID is required",
        });
      }

      // Check if user is trying to remove themselves
      if (userId === req.user._id.toString()) {
        return res.status(400).json({
          success: false,
          message: "Cannot remove yourself from the team",
        });
      }

      // Remove member
      await req.team.removeMember(userId);

      // Populate team data for response
      await req.team.populate("members", "username firstName lastName avatar");

      logger.info(
        `Admin ${req.user.username} removed member ${userId} from team: ${req.team.name}`,
      );

      res.json({
        success: true,
        message: "Member removed successfully",
        data: { team: req.team },
      });
    } catch (error) {
      logger.error("Remove team member error:", error);
      throw new AppError("Failed to remove member", 500);
    }
  }),
);

// @route   POST /api/teams/:id/transfer-admin
// @desc    Transfer admin role to another member
// @access  Private (Team Admin)
router.post(
  "/:id/transfer-admin",
  requireTeamOrganiser,
  catchAsync(async (req, res) => {
    try {
      const { userId } = req.body;

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: "User ID is required",
        });
      }

      // Check if user is trying to transfer to themselves
      if (userId === req.user._id.toString()) {
        return res.status(400).json({
          success: false,
          message: "You are already the admin of this team",
        });
      }

      // Check if user is a member
      if (!req.team.members.includes(userId)) {
        return res.status(400).json({
          success: false,
          message: "User must be a member of the team to become admin",
        });
      }

      // Transfer admin role
      req.team.admin = userId;
      await req.team.save();

      // Populate team data for response
      await req.team.populate("admin", "username firstName lastName avatar");

      logger.info(
        `Admin ${req.user.username} transferred admin role to ${userId} in team: ${req.team.name}`,
      );

      res.json({
        success: true,
        message: "Admin role transferred successfully",
        data: { team: req.team },
      });
    } catch (error) {
      logger.error("Transfer admin role error:", error);
      throw new AppError("Failed to transfer admin role", 500);
    }
  }),
);

// @route   GET /api/teams/:id/stats
// @desc    Get team statistics
// @access  Private (Team Member)
router.get(
  "/:id/stats",
  requireTeamMembership,
  catchAsync(async (req, res) => {
    try {
      // Update team stats
      await req.team.updateTaskStats();

      res.json({
        success: true,
        data: {
          stats: req.team.stats,
          memberCount: req.team.memberCount,
          completionRate: req.team.completionRate,
          isActiveTeam: req.team.isActiveTeam,
        },
      });
    } catch (error) {
      logger.error("Get team stats error:", error);
      throw new AppError("Failed to get team statistics", 500);
    }
  }),
);

// @route   POST /api/teams/:id/request-join
// @desc    Request to join a private team
// @access  Private
router.post(
  "/:id/request-join",
  body("message")
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage("Message cannot exceed 200 characters"),
  catchAsync(async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: errors.array(),
        });
      }

      const team = await Team.findById(req.params.id);
      if (!team) {
        return res.status(404).json({
          success: false,
          message: "Team not found",
        });
      }

      // Check if user is already a member
      if (team.members.includes(req.user._id)) {
        return res.status(400).json({
          success: false,
          message: "You are already a member of this team",
        });
      }

      // Check if user already has a pending join request
      const existingRequest = team.joinRequests.find(
        (request) =>
          request.user.toString() === req.user._id.toString() &&
          request.status === "pending",
      );

      if (existingRequest) {
        return res.status(400).json({
          success: false,
          message: "You already have a pending join request for this team",
        });
      }

      // Check if user has a pending invitation
      const pendingInvitation = team.invitedUsers.find(
        (invite) =>
          invite.user.toString() === req.user._id.toString() &&
          invite.status === "pending",
      );

      if (pendingInvitation) {
        return res.status(400).json({
          success: false,
          message:
            "You have a pending invitation to this team. Please respond to the invitation instead.",
        });
      }

      // Add join request
      team.joinRequests.push({
        user: req.user._id,
        message: req.body.message || "",
        requestedAt: new Date(),
        status: "pending",
      });

      await team.save();

      logger.info(
        `User ${req.user.username} requested to join team: ${team.name}`,
      );

      res.status(200).json({
        success: true,
        message: "Join request sent successfully",
        data: {
          teamId: team._id,
          teamName: team.name,
        },
      });
    } catch (error) {
      logger.error("Request join team error:", error);
      throw new AppError("Failed to send join request", 500);
    }
  }),
);

// @route   GET /api/teams/:id/join-requests
// @desc    Get join requests for a team (admin only)
// @access  Private
router.get(
  "/:id/join-requests",
  requireTeamOrganiser,
  catchAsync(async (req, res) => {
    try {
      const team = await Team.findById(req.params.id)
        .populate(
          "joinRequests.user",
          "username firstName lastName email avatar",
        )
        .select("joinRequests");

      if (!team) {
        return res.status(404).json({
          success: false,
          message: "Team not found",
        });
      }

      // Filter pending requests
      const pendingRequests = team.joinRequests.filter(
        (request) => request.status === "pending",
      );

      res.json({
        success: true,
        data: {
          requests: pendingRequests,
          total: pendingRequests.length,
        },
      });
    } catch (error) {
      logger.error("Get join requests error:", error);
      throw new AppError("Failed to get join requests", 500);
    }
  }),
);

// @route   POST /api/teams/:id/approve-join-request
// @desc    Approve a join request (admin only)
// @access  Private
router.post(
  "/:id/approve-join-request",
  requireTeamOrganiser,
  body("userId")
    .notEmpty()
    .withMessage("User ID is required")
    .isMongoId()
    .withMessage("Invalid user ID"),
  catchAsync(async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: errors.array(),
        });
      }

      const { userId } = req.body;

      const team = await Team.findById(req.params.id);
      if (!team) {
        return res.status(404).json({
          success: false,
          message: "Team not found",
        });
      }

      // Find the join request
      const joinRequest = team.joinRequests.find(
        (request) =>
          request.user.toString() === userId && request.status === "pending",
      );

      if (!joinRequest) {
        return res.status(404).json({
          success: false,
          message: "Join request not found or already processed",
        });
      }

      // Check if user is already a member
      if (team.members.includes(userId)) {
        return res.status(400).json({
          success: false,
          message: "User is already a member of this team",
        });
      }

      // Approve the request
      joinRequest.status = "approved";
      team.members.push(userId);

      await team.save();

      // Get user details for response
      const user = await User.findById(userId).select(
        "username firstName lastName",
      );

      logger.info(
        `Join request approved for user ${user.username} to team: ${team.name}`,
      );

      res.status(200).json({
        success: true,
        message: "Join request approved successfully",
        data: {
          teamId: team._id,
          teamName: team.name,
          newMember: user,
        },
      });
    } catch (error) {
      logger.error("Approve join request error:", error);
      throw new AppError("Failed to approve join request", 500);
    }
  }),
);

// @route   POST /api/teams/:id/deny-join-request
// @desc    Deny a join request (admin only)
// @access  Private
router.post(
  "/:id/deny-join-request",
  requireTeamOrganiser,
  body("userId")
    .notEmpty()
    .withMessage("User ID is required")
    .isMongoId()
    .withMessage("Invalid user ID"),
  body("reason")
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage("Reason cannot exceed 200 characters"),
  catchAsync(async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: errors.array(),
        });
      }

      const { userId, reason } = req.body;

      const team = await Team.findById(req.params.id);
      if (!team) {
        return res.status(404).json({
          success: false,
          message: "Team not found",
        });
      }

      // Find the join request
      const joinRequest = team.joinRequests.find(
        (request) =>
          request.user.toString() === userId && request.status === "pending",
      );

      if (!joinRequest) {
        return res.status(404).json({
          success: false,
          message: "Join request not found or already processed",
        });
      }

      // Deny the request
      joinRequest.status = "denied";
      if (reason) {
        joinRequest.reason = reason;
      }

      await team.save();

      // Get user details for response
      const user = await User.findById(userId).select(
        "username firstName lastName",
      );

      logger.info(
        `Join request denied for user ${user.username} to team: ${team.name}`,
      );

      res.status(200).json({
        success: true,
        message: "Join request denied",
        data: {
          teamId: team._id,
          teamName: team.name,
          deniedUser: user,
        },
      });
    } catch (error) {
      logger.error("Deny join request error:", error);
      throw new AppError("Failed to deny join request", 500);
    }
  }),
);

// @route   GET /api/teams/search
// @desc    Search for teams
// @access  Private
router.get(
  "/search",
  catchAsync(async (req, res) => {
    try {
      const { q, page = 1, limit = 20, type } = req.query;

      if (!q || q.trim().length < 2) {
        return res.status(400).json({
          success: false,
          message: "Search query must be at least 2 characters long",
        });
      }

      const query = {
        isActive: true,
        $or: [
          { name: { $regex: q, $options: "i" } },
          { description: { $regex: q, $options: "i" } },
          { tags: { $in: [new RegExp(q, "i")] } },
        ],
        // Don't show teams where user is already a member
        members: { $ne: req.user._id },
      };

      // Filter by type if provided
      if (type) {
        query.type = type;
      }

      const skip = (page - 1) * limit;

      const teams = await Team.find(query)
        .populate("admin", "username firstName lastName avatar")
        .select(
          "name description admin memberCount isPublic tags type createdAt",
        )
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));

      const total = await Team.countDocuments(query);

      // Add join status for each team
      const teamsWithStatus = teams.map((team) => {
        const teamObj = team.toObject();

        // Check if user has pending join request
        const hasPendingRequest = team.joinRequests?.some(
          (request) =>
            request.user.toString() === req.user._id.toString() &&
            request.status === "pending",
        );

        // Check if user has pending invitation
        const hasPendingInvitation = team.invitedUsers?.some(
          (invite) =>
            invite.user.toString() === req.user._id.toString() &&
            invite.status === "pending",
        );

        teamObj.userStatus = {
          canJoin: team.isPublic,
          canRequestJoin:
            !team.isPublic && !hasPendingRequest && !hasPendingInvitation,
          hasPendingRequest,
          hasPendingInvitation,
        };

        return teamObj;
      });

      res.json({
        success: true,
        data: {
          teams: teamsWithStatus,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / limit),
          },
        },
      });
    } catch (error) {
      logger.error("Search teams error:", error);
      throw new AppError("Failed to search teams", 500);
    }
  }),
);

// @desc    Get total members count across all user's teams
// @route   GET /api/teams/members-count
// @access  Private
router.get(
  "/members-count",
  requireAuth,
  catchAsync(async (req, res) => {
    try {
      const teams = await Team.find({
        $or: [{ admin: req.user._id }, { members: req.user._id }],
        isActive: true,
      }).populate("members", "_id");

      const totalMembers = teams.reduce((total, team) => {
        return total + (team.members?.length || 0);
      }, 0);

      res.json({
        success: true,
        data: {
          totalMembers,
          totalTeams: teams.length,
        },
      });
    } catch (error) {
      logger.error("Get members count error:", error);
      throw new AppError("Failed to get members count", 500);
    }
  }),
);

module.exports = router;
