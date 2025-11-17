const mongoose = require("mongoose");
const { logger } = require("../middleware/logger");

const teamSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Team name is required"],
      trim: true,
      maxlength: [100, "Team name cannot exceed 100 characters"],
    },
    description: {
      type: String,
      maxlength: [500, "Team description cannot exceed 500 characters"],
      default: "",
    },
    admin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Team admin is required"],
    },
    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    invitedUsers: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        invitedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        invitedAt: {
          type: Date,
          default: Date.now,
        },
        status: {
          type: String,
          enum: ["pending", "accepted", "declined"],
          default: "pending",
        },
      },
    ],
    joinRequests: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        requestedAt: {
          type: Date,
          default: Date.now,
        },
        status: {
          type: String,
          enum: ["pending", "approved", "denied"],
          default: "pending",
        },
        message: {
          type: String,
          maxlength: [200, "Join request message cannot exceed 200 characters"],
          default: "",
        },
      },
    ],
    isPublic: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    avatar: {
      type: String,
      default: null,
    },
    tags: [
      {
        type: String,
        trim: true,
        maxlength: [20, "Tag cannot exceed 20 characters"],
      },
    ],
    settings: {
      allowMemberInvites: {
        type: Boolean,
        default: true,
      },
      allowTaskCreation: {
        type: Boolean,
        default: true,
      },
      allowFileSharing: {
        type: Boolean,
        default: true,
      },
      notificationPreferences: {
        email: {
          type: Boolean,
          default: true,
        },
        push: {
          type: Boolean,
          default: true,
        },
      },
    },
    stats: {
      totalTasks: {
        type: Number,
        default: 0,
      },
      completedTasks: {
        type: Number,
        default: 0,
      },
      totalMembers: {
        type: Number,
        default: 0,
      },
      lastActivity: {
        type: Date,
        default: Date.now,
      },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Virtual for member count
teamSchema.virtual("memberCount").get(function () {
  return this.members ? this.members.length : 0;
});

// Virtual for completion rate
teamSchema.virtual("completionRate").get(function () {
  if (this.stats.totalTasks === 0) return 0;
  return Math.round((this.stats.completedTasks / this.stats.totalTasks) * 100);
});

// Virtual for team activity status
teamSchema.virtual("isActiveTeam").get(function () {
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  return this.stats.lastActivity > oneWeekAgo;
});

// Indexes
teamSchema.index({ name: 1 });
teamSchema.index({ admin: 1 });
teamSchema.index({ members: 1 });
teamSchema.index({ isActive: 1 });
teamSchema.index({ "invitedUsers.user": 1 });
teamSchema.index({ "joinRequests.user": 1 });
teamSchema.index({ tags: 1 });

// Pre-save middleware to update stats
teamSchema.pre("save", function (next) {
  // Update member count
  this.stats.totalMembers = this.members.length;

  // Update last activity
  this.stats.lastActivity = new Date();

  next();
});

// Pre-save middleware to ensure admin is always a member
teamSchema.pre("save", function (next) {
  if (this.admin && !this.members.includes(this.admin)) {
    this.members.push(this.admin);
  }
  next();
});

// Instance method to add member
teamSchema.methods.addMember = async function (userId, addedBy = null) {
  try {
    if (!this.members.includes(userId)) {
      this.members.push(userId);

      // Remove from invited users if exists
      this.invitedUsers = this.invitedUsers.filter(
        (invite) => invite.user.toString() !== userId.toString(),
      );

      await this.save();

      // Update stats
      this.stats.totalMembers = this.members.length;
      await this.save();

      logger.info(`User ${userId} added to team ${this._id}`);
      return true;
    }
    return false;
  } catch (error) {
    logger.error("Error adding member to team:", error);
    throw error;
  }
};

// Instance method to remove member
teamSchema.methods.removeMember = async function (userId) {
  try {
    if (userId.toString() === this.admin.toString()) {
      throw new Error("Cannot remove team admin");
    }

    const memberIndex = this.members.indexOf(userId);
    if (memberIndex > -1) {
      this.members.splice(memberIndex, 1);

      // Update stats
      this.stats.totalMembers = this.members.length;
      await this.save();

      logger.info(`User ${userId} removed from team ${this._id}`);
      return true;
    }
    return false;
  } catch (error) {
    logger.error("Error removing member from team:", error);
    throw error;
  }
};

// Instance method to invite user
teamSchema.methods.inviteUser = async function (userId, invitedBy) {
  try {
    // Check if user is already a member
    if (this.members.includes(userId)) {
      throw new Error("User is already a team member");
    }

    // Check if user is already invited
    const existingInvite = this.invitedUsers.find(
      (invite) => invite.user.toString() === userId.toString(),
    );

    if (existingInvite) {
      throw new Error("User has already been invited");
    }

    // Add invitation
    this.invitedUsers.push({
      user: userId,
      invitedBy: invitedBy || this.admin,
      invitedAt: new Date(),
      status: "pending",
    });

    await this.save();

    logger.info(`User ${userId} invited to team ${this._id}`);
    return true;
  } catch (error) {
    logger.error("Error inviting user to team:", error);
    throw error;
  }
};

// Instance method to accept invitation
teamSchema.methods.acceptInvitation = async function (userId) {
  try {
    const invite = this.invitedUsers.find(
      (invite) =>
        invite.user.toString() === userId.toString() &&
        invite.status === "pending",
    );

    if (!invite) {
      throw new Error("No pending invitation found");
    }

    // Update invitation status
    invite.status = "accepted";

    // Add to members
    await this.addMember(userId);

    await this.save();

    logger.info(`User ${userId} accepted invitation to team ${this._id}`);
    return true;
  } catch (error) {
    logger.error("Error accepting team invitation:", error);
    throw error;
  }
};

// Instance method to decline invitation
teamSchema.methods.declineInvitation = async function (userId) {
  try {
    const invite = this.invitedUsers.find(
      (invite) =>
        invite.user.toString() === userId.toString() &&
        invite.status === "pending",
    );

    if (!invite) {
      throw new Error("No pending invitation found");
    }

    // Update invitation status
    invite.status = "declined";

    await this.save();

    logger.info(`User ${userId} declined invitation to team ${this._id}`);
    return true;
  } catch (error) {
    logger.error("Error declining team invitation:", error);
    throw error;
  }
};

// Instance method to update task stats
teamSchema.methods.updateTaskStats = async function () {
  try {
    const Task = require("./Task");
    const taskStats = await Task.aggregate([
      { $match: { team: this._id, isArchived: false } }, // Only count non-archived tasks
      {
        $group: {
          _id: null,
          totalTasks: { $sum: 1 },
          completedTasks: {
            $sum: {
              $cond: [{ $eq: ["$status", "completed"] }, 1, 0],
            },
          },
        },
      },
    ]);

    if (taskStats.length > 0) {
      this.stats.totalTasks = taskStats[0].totalTasks;
      this.stats.completedTasks = taskStats[0].completedTasks;
    } else {
      // No tasks found, reset stats
      this.stats.totalTasks = 0;
      this.stats.completedTasks = 0;
    }
    await this.save();
  } catch (error) {
    logger.error("Error updating team task stats:", error);
  }
};

// Static method to find teams by user
teamSchema.statics.findByUser = function (userId) {
  return this.find({
    $or: [{ admin: userId }, { members: userId }],
    isActive: true,
  }).populate("admin", "username firstName lastName avatar");
};

// Static method to find public teams
teamSchema.statics.findPublicTeams = function () {
  return this.find({
    isPublic: true,
    isActive: true,
  }).populate("admin", "username firstName lastName avatar");
};

// Static method to search teams
teamSchema.statics.searchTeams = function (query, userId = null) {
  const searchQuery = {
    $and: [
      { isActive: true },
      {
        $or: [
          { name: { $regex: query, $options: "i" } },
          { description: { $regex: query, $options: "i" } },
          { tags: { $in: [new RegExp(query, "i")] } },
        ],
      },
    ],
  };

  // If user is provided, include teams they're not part of
  if (userId) {
    searchQuery.$and.push({
      $nor: [{ admin: userId }, { members: userId }],
    });
  }

  return this.find(searchQuery)
    .populate("admin", "username firstName lastName avatar")
    .limit(20);
};

module.exports = mongoose.model("Team", teamSchema);
