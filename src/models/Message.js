const mongoose = require("mongoose");
const logger = require("../middleware/logger");

const messageSchema = new mongoose.Schema(
  {
    team: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Team",
      required: [true, "Team is required"],
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Sender is required"],
    },
    content: {
      type: String,
      required: [true, "Message content is required"],
      maxlength: [2000, "Message content cannot exceed 2000 characters"],
    },
    messageType: {
      type: String,
      enum: ["text", "file", "image", "system", "task_update"],
      default: "text",
    },
    attachments: [
      {
        filename: String,
        originalName: String,
        mimeType: String,
        size: Number,
        path: String,
        thumbnail: String,
      },
    ],
    mentions: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        username: String,
      },
    ],
    reactions: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        emoji: String,
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    replyTo: {
      message: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Message",
      },
      content: String,
      sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    },
    isEdited: {
      type: Boolean,
      default: false,
    },
    editedAt: Date,
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: Date,
    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    metadata: {
      taskId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Task",
      },
      taskAction: String, // 'created', 'updated', 'assigned', 'completed'
      systemEvent: String, // 'member_joined', 'member_left', 'task_created', etc.
      externalLink: String,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual for formatted content
messageSchema.virtual("formattedContent").get(function () {
  if (this.isDeleted) {
    return "[Message deleted]";
  }

  let content = this.content;

  // Format mentions
  if (this.mentions && this.mentions.length > 0) {
    this.mentions.forEach((mention) => {
      const regex = new RegExp(`@${mention.username}`, "g");
      content = content.replace(
        regex,
        `<span class="mention">@${mention.username}</span>`
      );
    });
  }

  // Format links
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  content = content.replace(
    urlRegex,
    '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>'
  );

  return content;
});

// Virtual for reaction summary
messageSchema.virtual("reactionSummary").get(function () {
  if (!this.reactions || this.reactions.length === 0) {
    return [];
  }

  const summary = {};
  this.reactions.forEach((reaction) => {
    if (!summary[reaction.emoji]) {
      summary[reaction.emoji] = {
        count: 0,
        users: [],
      };
    }
    summary[reaction.emoji].count++;
    summary[reaction.emoji].users.push(reaction.user);
  });

  return Object.entries(summary).map(([emoji, data]) => ({
    emoji,
    count: data.count,
    users: data.users,
  }));
});

// Virtual for is system message
messageSchema.virtual("isSystemMessage").get(function () {
  return this.messageType === "system";
});

// Indexes
messageSchema.index({ team: 1, createdAt: -1 });
messageSchema.index({ sender: 1 });
messageSchema.index({ messageType: 1 });
messageSchema.index({ "mentions.user": 1 });
messageSchema.index({ "metadata.taskId": 1 });
messageSchema.index({ createdAt: -1 });

// Pre-save middleware to process mentions
messageSchema.pre("save", function (next) {
  if (this.isModified("content") && this.messageType === "text") {
    // Extract mentions from content (@username)
    const mentionRegex = /@(\w+)/g;
    const mentions = [];
    let match;

    while ((match = mentionRegex.exec(this.content)) !== null) {
      mentions.push({
        username: match[1],
      });
    }

    this.mentions = mentions;
  }
  next();
});

// Pre-save middleware to update edited timestamp
messageSchema.pre("save", function (next) {
  if (this.isModified("content") && !this.isNew) {
    this.isEdited = true;
    this.editedAt = new Date();
  }
  next();
});

// Instance method to add reaction
messageSchema.methods.addReaction = async function (userId, emoji) {
  try {
    // Check if user already reacted with this emoji
    const existingReaction = this.reactions.find(
      (reaction) =>
        reaction.user.toString() === userId.toString() &&
        reaction.emoji === emoji
    );

    if (existingReaction) {
      // Remove existing reaction
      this.reactions = this.reactions.filter(
        (reaction) =>
          !(
            reaction.user.toString() === userId.toString() &&
            reaction.emoji === emoji
          )
      );
    } else {
      // Add new reaction
      this.reactions.push({
        user: userId,
        emoji,
        createdAt: new Date(),
      });
    }

    await this.save();

    logger.info(
      `Reaction ${emoji} ${
        existingReaction ? "removed from" : "added to"
      } message ${this._id} by user ${userId}`
    );
    return true;
  } catch (error) {
    logger.error("Error adding/removing reaction:", error);
    throw error;
  }
};

// Instance method to edit message
messageSchema.methods.editMessage = async function (newContent, userId) {
  try {
    if (this.sender.toString() !== userId.toString()) {
      throw new Error("Only message sender can edit the message");
    }

    if (this.isDeleted) {
      throw new Error("Cannot edit deleted message");
    }

    this.content = newContent;
    this.isEdited = true;
    this.editedAt = new Date();

    await this.save();

    logger.info(`Message ${this._id} edited by user ${userId}`);
    return true;
  } catch (error) {
    logger.error("Error editing message:", error);
    throw error;
  }
};

// Instance method to delete message
messageSchema.methods.deleteMessage = async function (userId, isAdmin = false) {
  try {
    if (!isAdmin && this.sender.toString() !== userId.toString()) {
      throw new Error("Only message sender or admin can delete the message");
    }

    this.isDeleted = true;
    this.deletedAt = new Date();
    this.deletedBy = userId;

    await this.save();

    logger.info(`Message ${this._id} deleted by user ${userId}`);
    return true;
  } catch (error) {
    logger.error("Error deleting message:", error);
    throw error;
  }
};

// Instance method to create system message
messageSchema.statics.createSystemMessage = async function (
  teamId,
  content,
  metadata = {}
) {
  try {
    const message = new this({
      team: teamId,
      sender: null, // System messages don't have a sender
      content,
      messageType: "system",
      metadata,
    });

    await message.save();

    logger.info(`System message created in team ${teamId}: ${content}`);
    return message;
  } catch (error) {
    logger.error("Error creating system message:", error);
    throw error;
  }
};

// Instance method to create task update message
messageSchema.statics.createTaskUpdateMessage = async function (
  teamId,
  senderId,
  taskId,
  action,
  taskTitle
) {
  try {
    const actionMessages = {
      created: "created a new task",
      updated: "updated the task",
      assigned: "assigned the task to",
      completed: "marked the task as completed",
      cancelled: "cancelled the task",
    };

    const content = `${actionMessages[action] || "updated"} "${taskTitle}"`;

    const message = new this({
      team: teamId,
      sender: senderId,
      content,
      messageType: "task_update",
      metadata: {
        taskId,
        taskAction: action,
      },
    });

    await message.save();

    logger.info(
      `Task update message created in team ${teamId} for task ${taskId}`
    );
    return message;
  } catch (error) {
    logger.error("Error creating task update message:", error);
    throw error;
  }
};

// Static method to find messages by team
messageSchema.statics.findByTeam = function (teamId, options = {}) {
  const query = { team: teamId, isDeleted: false };

  if (options.messageType) query.messageType = options.messageType;
  if (options.sender) query.sender = options.sender;
  if (options.before) query.createdAt = { $lt: options.before };
  if (options.after) query.createdAt = { $gt: options.after };

  return this.find(query)
    .populate("sender", "username firstName lastName avatar")
    .populate("replyTo.message")
    .populate("replyTo.sender", "username firstName lastName avatar")
    .populate("mentions.user", "username firstName lastName avatar")
    .sort({ createdAt: -1 })
    .limit(options.limit || 50);
};

// Static method to search messages
messageSchema.statics.searchMessages = function (
  teamId,
  searchQuery,
  options = {}
) {
  const query = {
    team: teamId,
    isDeleted: false,
    content: { $regex: searchQuery, $options: "i" },
  };

  if (options.sender) query.sender = options.sender;
  if (options.messageType) query.messageType = options.messageType;

  return this.find(query)
    .populate("sender", "username firstName lastName avatar")
    .sort({ createdAt: -1 })
    .limit(options.limit || 20);
};

module.exports = mongoose.model("Message", messageSchema);
