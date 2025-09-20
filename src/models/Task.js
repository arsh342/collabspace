const mongoose = require("mongoose");
const { logger } = require("../middleware/logger");

const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Task title is required"],
      trim: true,
      maxlength: [200, "Task title cannot exceed 200 characters"],
    },
    description: {
      type: String,
      maxlength: [2000, "Task description cannot exceed 2000 characters"],
      default: "",
    },
    team: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Team",
      required: [true, "Team is required"],
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Task creator is required"],
    },
    status: {
      type: String,
      enum: ["todo", "in_progress", "review", "completed", "cancelled"],
      default: "todo",
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
    },
    dueDate: {
      type: Date,
    },
    estimatedHours: {
      type: Number,
      min: [0, "Estimated hours cannot be negative"],
      max: [1000, "Estimated hours cannot exceed 1000"],
    },
    actualHours: {
      type: Number,
      min: [0, "Actual hours cannot be negative"],
      max: [1000, "Actual hours cannot exceed 1000"],
    },
    tags: [
      {
        type: String,
        trim: true,
        maxlength: [20, "Tag cannot exceed 20 characters"],
      },
    ],
    attachments: [
      {
        filename: String,
        originalName: String,
        mimeType: String,
        size: Number,
        path: String,
        uploadedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        uploadedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    comments: [
      {
        content: {
          type: String,
          required: true,
          maxlength: [1000, "Comment cannot exceed 1000 characters"],
        },
        author: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
        updatedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    dependencies: [
      {
        task: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Task",
        },
        type: {
          type: String,
          enum: ["blocks", "blocked_by", "related"],
          default: "blocks",
        },
      },
    ],
    timeLogs: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        hours: {
          type: Number,
          required: true,
          min: [0.1, "Time log must be at least 0.1 hours"],
          max: [24, "Time log cannot exceed 24 hours"],
        },
        description: {
          type: String,
          maxlength: [500, "Time log description cannot exceed 500 characters"],
        },
        loggedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    isArchived: {
      type: Boolean,
      default: false,
    },
    completedAt: Date,
    progress: {
      type: Number,
      min: [0, "Progress cannot be negative"],
      max: [100, "Progress cannot exceed 100"],
      default: 0,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual for overdue status
taskSchema.virtual("isOverdue").get(function () {
  if (
    !this.dueDate ||
    this.status === "completed" ||
    this.status === "cancelled"
  ) {
    return false;
  }
  return new Date() > this.dueDate;
});

// Virtual for days until due
taskSchema.virtual("daysUntilDue").get(function () {
  if (!this.dueDate) return null;
  const now = new Date();
  const due = new Date(this.dueDate);
  const diffTime = due - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
});

// Virtual for total time logged
taskSchema.virtual("totalTimeLogged").get(function () {
  return this.timeLogs.reduce((total, log) => total + log.hours, 0);
});

// Virtual for status color
taskSchema.virtual("statusColor").get(function () {
  const colors = {
    todo: "#6c757d",
    in_progress: "#007bff",
    review: "#ffc107",
    completed: "#28a745",
    cancelled: "#dc3545",
  };
  return colors[this.status] || "#6c757d";
});

// Virtual for priority color
taskSchema.virtual("priorityColor").get(function () {
  const colors = {
    low: "#28a745",
    medium: "#ffc107",
    high: "#fd7e14",
    urgent: "#dc3545",
  };
  return colors[this.priority] || "#ffc107";
});

// Indexes
taskSchema.index({ team: 1 });
taskSchema.index({ assignedTo: 1 });
taskSchema.index({ createdBy: 1 });
taskSchema.index({ status: 1 });
taskSchema.index({ priority: 1 });
taskSchema.index({ dueDate: 1 });
taskSchema.index({ tags: 1 });
taskSchema.index({ isArchived: 1 });
taskSchema.index({ "dependencies.task": 1 });

// Pre-save middleware to update progress based on status
taskSchema.pre("save", function (next) {
  if (this.isModified("status")) {
    if (this.status === "completed") {
      this.progress = 100;
      this.completedAt = new Date();
    } else if (this.status === "cancelled") {
      this.progress = 0;
    } else if (this.status === "in_progress") {
      if (this.progress === 0) this.progress = 25;
    } else if (this.status === "review") {
      if (this.progress < 90) this.progress = 90;
    }
  }
  next();
});

// Pre-save middleware to update team stats
taskSchema.pre("save", async function (next) {
  if (this.isModified("status") || this.isNew) {
    try {
      const Team = require("./Team");
      await Team.findByIdAndUpdate(this.team, {
        $inc: {
          "stats.totalTasks": this.isNew ? 1 : 0,
          "stats.completedTasks": this.status === "completed" ? 1 : 0,
        },
      });
    } catch (error) {
      logger.error("Error updating team stats:", error);
    }
  }
  next();
});

// Instance method to add comment
taskSchema.methods.addComment = async function (content, authorId) {
  try {
    this.comments.push({
      content,
      author: authorId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await this.save();

    logger.info(`Comment added to task ${this._id} by user ${authorId}`);
    return this.comments[this.comments.length - 1];
  } catch (error) {
    logger.error("Error adding comment to task:", error);
    throw error;
  }
};

// Instance method to update comment
taskSchema.methods.updateComment = async function (
  commentId,
  content,
  authorId
) {
  try {
    const comment = this.comments.id(commentId);

    if (!comment) {
      throw new Error("Comment not found");
    }

    if (comment.author.toString() !== authorId.toString()) {
      throw new Error("Only comment author can edit the comment");
    }

    comment.content = content;
    comment.updatedAt = new Date();

    await this.save();

    logger.info(`Comment ${commentId} updated in task ${this._id}`);
    return comment;
  } catch (error) {
    logger.error("Error updating comment:", error);
    throw error;
  }
};

// Instance method to log time
taskSchema.methods.logTime = async function (userId, hours, description = "") {
  try {
    this.timeLogs.push({
      user: userId,
      hours,
      description,
      loggedAt: new Date(),
    });

    // Update actual hours
    this.actualHours = (this.actualHours || 0) + hours;

    await this.save();

    logger.info(
      `Time logged to task ${this._id}: ${hours} hours by user ${userId}`
    );
    return this.timeLogs[this.timeLogs.length - 1];
  } catch (error) {
    logger.error("Error logging time to task:", error);
    throw error;
  }
};

// Instance method to assign task
taskSchema.methods.assignTo = async function (userId) {
  try {
    this.assignedTo = userId;
    await this.save();

    logger.info(`Task ${this._id} assigned to user ${userId}`);
    return true;
  } catch (error) {
    logger.error("Error assigning task:", error);
    throw error;
  }
};

// Instance method to update status
taskSchema.methods.updateStatus = async function (newStatus, userId) {
  try {
    const oldStatus = this.status;
    this.status = newStatus;

    if (newStatus === "completed") {
      this.completedAt = new Date();
      this.progress = 100;
    }

    await this.save();

    logger.info(
      `Task ${this._id} status changed from ${oldStatus} to ${newStatus} by user ${userId}`
    );
    return true;
  } catch (error) {
    logger.error("Error updating task status:", error);
    throw error;
  }
};

// Instance method to add dependency
taskSchema.methods.addDependency = async function (taskId, type = "blocks") {
  try {
    // Check if dependency already exists
    const existingDependency = this.dependencies.find(
      (dep) => dep.task.toString() === taskId.toString()
    );

    if (existingDependency) {
      throw new Error("Dependency already exists");
    }

    this.dependencies.push({
      task: taskId,
      type,
    });

    await this.save();

    logger.info(`Dependency added to task ${this._id}: ${type} ${taskId}`);
    return true;
  } catch (error) {
    logger.error("Error adding task dependency:", error);
    throw error;
  }
};

// Static method to find tasks by team
taskSchema.statics.findByTeam = function (teamId, options = {}) {
  const query = { team: teamId, isArchived: false };

  if (options.status) query.status = options.status;
  if (options.priority) query.priority = options.priority;
  if (options.assignedTo) query.assignedTo = options.assignedTo;

  return this.find(query)
    .populate("assignedTo", "username firstName lastName avatar")
    .populate("createdBy", "username firstName lastName avatar")
    .sort(options.sort || { createdAt: -1 });
};

// Static method to find overdue tasks
taskSchema.statics.findOverdue = function (teamId = null) {
  const query = {
    dueDate: { $lt: new Date() },
    status: { $nin: ["completed", "cancelled"] },
    isArchived: false,
  };

  if (teamId) query.team = teamId;

  return this.find(query)
    .populate("assignedTo", "username firstName lastName avatar")
    .populate("team", "name")
    .sort({ dueDate: 1 });
};

// Static method to find tasks by user
taskSchema.statics.findByUser = function (userId, options = {}) {
  const query = {
    $or: [{ assignedTo: userId }, { createdBy: userId }],
    isArchived: false,
  };

  if (options.status) query.status = options.status;
  if (options.team) query.team = options.team;

  return this.find(query)
    .populate("team", "name")
    .populate("assignedTo", "username firstName lastName avatar")
    .sort(options.sort || { dueDate: 1, createdAt: -1 });
};

// Post-remove middleware to update team stats when task is deleted
taskSchema.post("findOneAndDelete", async function (doc) {
  if (doc && doc.team) {
    try {
      const Team = require("./Team");
      await Team.findByIdAndUpdate(doc.team, {
        $inc: {
          "stats.totalTasks": -1,
          "stats.completedTasks": doc.status === "completed" ? -1 : 0,
        },
      });
      logger.info(`Updated team stats after task deletion: team=${doc.team}, task=${doc._id}`);
    } catch (error) {
      logger.error("Error updating team stats after task deletion:", error);
    }
  }
});

// Post-remove middleware for deleteOne method
taskSchema.post("deleteOne", async function (result) {
  if (result && result.deletedCount > 0) {
    try {
      // Since we don't have access to the document in deleteOne, 
      // we'll need to update this in the route instead
      logger.info("Task deleted via deleteOne method");
    } catch (error) {
      logger.error("Error in deleteOne post middleware:", error);
    }
  }
});

module.exports = mongoose.model("Task", taskSchema);
