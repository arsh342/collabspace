const express = require("express");
const { body, validationResult } = require("express-validator");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const Message = require("../models/Message");
const Team = require("../models/Team");
const { catchAsync, AppError } = require("../middleware/errorHandler");
const {
  requireTeamMembership,
  authenticateSession,
} = require("../middleware/auth");
const { logger } = require("../middleware/logger");
const { invalidateCacheMiddleware } = require("../middleware/cache");

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = process.env.UPLOAD_PATH || "./uploads";
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "message-" + uniqueSuffix + path.extname(file.originalname));
  },
});

const fileFilter = (req, file, cb) => {
  // Allow common file types
  const allowedTypes = [
    "image/jpeg",
    "image/png",
    "image/gif",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
    "application/zip",
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("File type not allowed"), false);
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024, // 5MB default
  },
  fileFilter: fileFilter,
});

// Validation middleware
const validateMessage = [
  body("content")
    .trim()
    .custom((value, { req }) => {
      // Allow empty content for file messages, require content for text messages
      if (req.body.messageType === "file" || req.body.messageType === "image") {
        return true; // Allow empty content for file/image messages
      }
      if (!value || value.length < 1) {
        throw new Error("Message content is required for text messages");
      }
      if (value.length > 2000) {
        throw new Error("Message content cannot exceed 2000 characters");
      }
      return true;
    }),
  body("teamId").isMongoId().withMessage("Valid team ID is required"),
  body("messageType")
    .optional()
    .isIn(["text", "file", "image", "system"])
    .withMessage("Message type must be one of: text, file, image, system"),
  body("replyTo")
    .optional()
    .isMongoId()
    .withMessage("Valid message ID is required for reply"),
];

const validateMessageUpdate = [
  body("content")
    .trim()
    .isLength({ min: 1, max: 2000 })
    .withMessage("Message content must be between 1 and 2000 characters"),
];

const validateReaction = [
  body("emoji")
    .trim()
    .isLength({ min: 1, max: 10 })
    .withMessage("Emoji must be between 1 and 10 characters"),
];

// @route   GET /api/messages/:teamId
// @desc    Get messages for a team
// @access  Private (Team Member)
router.get(
  "/:teamId",
  requireTeamMembership,
  catchAsync(async (req, res) => {
    try {
      const {
        page = 1,
        limit = 50,
        messageType,
        sender,
        before,
        after,
        search,
      } = req.query;

      const options = {
        messageType,
        sender,
        before,
        after,
        limit: parseInt(limit),
      };

      // Remove undefined options
      Object.keys(options).forEach(
        (key) => options[key] === undefined && delete options[key]
      );

      let messages;

      if (search) {
        // Search messages
        messages = await Message.searchMessages(
          req.params.teamId,
          search,
          options
        );
      } else {
        // Get messages by team
        messages = await Message.findByTeam(req.params.teamId, options);
      }

      // Get total count for pagination
      const query = { team: req.params.teamId, isDeleted: false };
      if (messageType) query.messageType = messageType;
      if (sender) query.sender = sender;

      const total = await Message.countDocuments(query);

      // Format messages for dashboard compatibility
      const formattedMessages = messages.map((message) => {
        console.log("Message sender:", message.sender); // Debug log
        return {
          _id: message._id,
          content: message.content,
          messageType: message.messageType,
          sender: {
            _id: message.sender._id,
            username: message.sender.username,
            firstName: message.sender.firstName,
            lastName: message.sender.lastName,
            avatar: message.sender.avatar,
          },
          team: message.team,
          createdAt: message.createdAt,
          updatedAt: message.updatedAt,
          formattedDate: message.createdAt.toLocaleString(),
          senderName: `${message.sender.firstName} ${message.sender.lastName}`,
        };
      });

      res.json({
        success: true,
        data: {
          messages: formattedMessages,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / limit),
          },
        },
      });
    } catch (error) {
      logger.error("Get team messages error:", error);
      throw new AppError("Failed to get team messages", 500);
    }
  })
);

// @route   POST /api/messages
// @desc    Send a new message
// @access  Private
router.post(
  "/",
  authenticateSession,
  validateMessage,
  invalidateCacheMiddleware(
    ["realtime:unread-count:*", "realtime:notifications:*"],
    true
  ), // Only real-time data
  catchAsync(async (req, res) => {
    // Set client cache invalidation headers
    res.setHeader("X-Invalidate-Client-Cache", "messages");
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        logger.error("Message validation failed:", errors.array());
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: errors.array(),
        });
      }

      const { content, teamId, messageType = "text", replyTo } = req.body;
      logger.info(
        `Attempting to send message: content="${content}", teamId="${teamId}", user="${req.user._id}"`
      );

      // Verify user is member of the team
      const team = await Team.findById(teamId);
      if (!team) {
        logger.error(`Team not found: ${teamId}`);
        return res.status(404).json({
          success: false,
          message: "Team not found",
        });
      }

      if (!team.members.includes(req.user._id)) {
        logger.error(`User ${req.user._id} is not a member of team ${teamId}`);
        return res.status(403).json({
          success: false,
          message: "You are not a member of this team",
        });
      }

      // Create message data
      const messageData = {
        team: teamId,
        sender: req.user._id,
        content,
        messageType,
      };

      // Add reply information if replying to a message
      if (replyTo) {
        const replyMessage = await Message.findById(replyTo);
        if (replyMessage && replyMessage.team.toString() === teamId) {
          messageData.replyTo = {
            message: replyTo,
            content: replyMessage.content.substring(0, 100), // Truncate content
            sender: replyMessage.sender,
          };
        }
      }

      // Create new message
      const message = new Message(messageData);
      await message.save();

      // Populate message data for response
      await message.populate("sender", "username firstName lastName avatar");
      if (message.replyTo && message.replyTo.message) {
        await message.populate("replyTo.message");
        await message.populate(
          "replyTo.sender",
          "username firstName lastName avatar"
        );
      }

      logger.info(
        `User ${req.user.username} sent message in team: ${team.name}`
      );

      // Format response for dashboard compatibility
      const responseMessage = {
        _id: message._id,
        content: message.content,
        messageType: message.messageType,
        sender: {
          _id: message.sender._id,
          username: message.sender.username,
          firstName: message.sender.firstName,
          lastName: message.sender.lastName,
          avatar: message.sender.avatar,
        },
        team: message.team,
        createdAt: message.createdAt,
        updatedAt: message.updatedAt,
        formattedDate: message.createdAt.toLocaleString(),
        senderName: `${message.sender.firstName} ${message.sender.lastName}`,
      };

      res.status(201).json({
        success: true,
        message: "Message sent successfully",
        data: {
          message: responseMessage,
        },
      });
    } catch (error) {
      logger.error("Send message error:", error);
      throw new AppError("Failed to send message", 500);
    }
  })
);

// @route   POST /api/messages/file
// @desc    Send a file message
// @access  Private
router.post(
  "/file",
  upload.single("file"),
  catchAsync(async (req, res) => {
    try {
      const { teamId, messageType = "file", replyTo } = req.body;

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "File is required",
        });
      }

      // Verify user is member of the team
      const team = await Team.findById(teamId);
      if (!team || !team.members.includes(req.user._id)) {
        return res.status(403).json({
          success: false,
          message: "You are not a member of this team",
        });
      }

      // Create message data
      const messageData = {
        team: teamId,
        sender: req.user._id,
        content: `File: ${req.file.originalname}`,
        messageType: messageType === "image" ? "image" : "file",
        attachments: [
          {
            filename: req.file.filename,
            originalName: req.file.originalname,
            mimeType: req.file.mimetype,
            size: req.file.size,
            path: req.file.path,
          },
        ],
      };

      // Add reply information if replying to a message
      if (replyTo) {
        const replyMessage = await Message.findById(replyTo);
        if (replyMessage && replyMessage.team.toString() === teamId) {
          messageData.replyTo = {
            message: replyTo,
            content: replyMessage.content.substring(0, 100),
            sender: replyMessage.sender,
          };
        }
      }

      // Create new message
      const message = new Message(messageData);
      await message.save();

      // Populate message data for response
      await message.populate("sender", "username firstName lastName avatar");
      if (message.replyTo && message.replyTo.message) {
        await message.populate("replyTo.message");
        await message.populate(
          "replyTo.sender",
          "username firstName lastName avatar"
        );
      }

      logger.info(
        `User ${req.user.username} sent file message in team: ${team.name}`
      );

      res.status(201).json({
        success: true,
        message: "File message sent successfully",
        data: { message },
      });
    } catch (error) {
      logger.error("Send file message error:", error);
      throw new AppError("Failed to send file message", 500);
    }
  })
);

// @route   GET /api/messages/:id
// @desc    Get message details
// @access  Private
router.get(
  "/message/:id",
  catchAsync(async (req, res) => {
    try {
      const message = await Message.findById(req.params.id)
        .populate("sender", "username firstName lastName avatar")
        .populate("replyTo.message")
        .populate("replyTo.sender", "username firstName lastName avatar")
        .populate("mentions.user", "username firstName lastName avatar");

      if (!message) {
        return res.status(404).json({
          success: false,
          message: "Message not found",
        });
      }

      // Verify user is member of the team
      const team = await Team.findById(message.team);
      if (!team || !team.members.includes(req.user._id)) {
        return res.status(403).json({
          success: false,
          message: "You do not have access to this message",
        });
      }

      res.json({
        success: true,
        data: { message },
      });
    } catch (error) {
      logger.error("Get message details error:", error);
      throw new AppError("Failed to get message details", 500);
    }
  })
);

// @route   PUT /api/messages/:id
// @desc    Edit message
// @access  Private
router.put(
  "/:id",
  validateMessageUpdate,
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

      const { content } = req.body;

      const message = await Message.findById(req.params.id);

      if (!message) {
        return res.status(404).json({
          success: false,
          message: "Message not found",
        });
      }

      // Verify user is the sender
      if (message.sender.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: "Only message sender can edit the message",
        });
      }

      // Verify user is still member of the team
      const team = await Team.findById(message.team);
      if (!team || !team.members.includes(req.user._id)) {
        return res.status(403).json({
          success: false,
          message: "You do not have access to this message",
        });
      }

      // Edit message
      await message.editMessage(content, req.user._id);

      // Populate updated message data
      await message.populate("sender", "username firstName lastName avatar");

      logger.info(`User ${req.user.username} edited message: ${message._id}`);

      res.json({
        success: true,
        message: "Message edited successfully",
        data: { message },
      });
    } catch (error) {
      logger.error("Edit message error:", error);
      throw new AppError("Failed to edit message", 500);
    }
  })
);

// @route   DELETE /api/messages/:id
// @desc    Delete message
// @access  Private
router.delete(
  "/:id",
  invalidateCacheMiddleware(["realtime:unread-count:*"], true), // Only real-time data
  catchAsync(async (req, res) => {
    // Set client cache invalidation headers
    res.setHeader("X-Invalidate-Client-Cache", "messages");
    try {
      const message = await Message.findById(req.params.id);

      if (!message) {
        return res.status(404).json({
          success: false,
          message: "Message not found",
        });
      }

      // Verify user is the sender or team admin
      const team = await Team.findById(message.team);
      if (!team || !team.members.includes(req.user._id)) {
        return res.status(403).json({
          success: false,
          message: "You do not have access to this message",
        });
      }

      const isTeamAdmin = team.admin.toString() === req.user._id.toString();
      const isSender = message.sender.toString() === req.user._id.toString();

      if (!isSender && !isTeamAdmin) {
        return res.status(403).json({
          success: false,
          message: "Only message sender or team admin can delete this message",
        });
      }

      // Delete message
      await message.deleteMessage(req.user._id, isTeamAdmin);

      logger.info(`User ${req.user.username} deleted message: ${message._id}`);

      res.json({
        success: true,
        message: "Message deleted successfully",
      });
    } catch (error) {
      logger.error("Delete message error:", error);
      throw new AppError("Failed to delete message", 500);
    }
  })
);

// @route   POST /api/messages/:id/reactions
// @desc    Add/remove reaction to message
// @access  Private
router.post(
  "/:id/reactions",
  validateReaction,
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

      const { emoji } = req.body;

      const message = await Message.findById(req.params.id);

      if (!message) {
        return res.status(404).json({
          success: false,
          message: "Message not found",
        });
      }

      // Verify user is member of the team
      const team = await Team.findById(message.team);
      if (!team || !team.members.includes(req.user._id)) {
        return res.status(403).json({
          success: false,
          message: "You do not have access to this message",
        });
      }

      // Add/remove reaction
      await message.addReaction(req.user._id, emoji);

      // Populate message data for response
      await message.populate(
        "reactions.user",
        "username firstName lastName avatar"
      );

      logger.info(
        `User ${req.user.username} ${
          message.reactions.find(
            (r) =>
              r.user._id.toString() === req.user._id.toString() &&
              r.emoji === emoji
          )
            ? "added"
            : "removed"
        } reaction ${emoji} to message: ${message._id}`
      );

      res.json({
        success: true,
        message: "Reaction updated successfully",
        data: { message },
      });
    } catch (error) {
      logger.error("Update reaction error:", error);
      throw new AppError("Failed to update reaction", 500);
    }
  })
);

// @route   GET /api/messages/:id/reactions
// @desc    Get message reactions
// @access  Private
router.get(
  "/:id/reactions",
  catchAsync(async (req, res) => {
    try {
      const message = await Message.findById(req.params.id);

      if (!message) {
        return res.status(404).json({
          success: false,
          message: "Message not found",
        });
      }

      // Verify user is member of the team
      const team = await Team.findById(message.team);
      if (!team || !team.members.includes(req.user._id)) {
        return res.status(403).json({
          success: false,
          message: "You do not have access to this message",
        });
      }

      res.json({
        success: true,
        data: {
          reactions: message.reactionSummary,
          totalReactions: message.reactions.length,
        },
      });
    } catch (error) {
      logger.error("Get message reactions error:", error);
      throw new AppError("Failed to get message reactions", 500);
    }
  })
);

// @route   GET /api/messages/search/:teamId
// @desc    Search messages in team
// @access  Private (Team Member)
router.get(
  "/search/:teamId",
  requireTeamMembership,
  catchAsync(async (req, res) => {
    try {
      const { q, messageType, sender, page = 1, limit = 20 } = req.query;

      if (!q || q.length < 2) {
        return res.status(400).json({
          success: false,
          message: "Search query must be at least 2 characters long",
        });
      }

      const options = { messageType, sender, limit: parseInt(limit) };

      // Remove undefined options
      Object.keys(options).forEach(
        (key) => options[key] === undefined && delete options[key]
      );

      const skip = (page - 1) * limit;

      const messages = await Message.searchMessages(
        req.params.teamId,
        q,
        options
      );

      // Get total count for pagination
      const query = {
        team: req.params.teamId,
        isDeleted: false,
        content: { $regex: q, $options: "i" },
      };

      if (messageType) query.messageType = messageType;
      if (sender) query.sender = sender;

      const total = await Message.countDocuments(query);

      res.json({
        success: true,
        data: {
          messages,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / limit),
          },
        },
      });
    } catch (error) {
      logger.error("Search messages error:", error);
      throw new AppError("Failed to search messages", 500);
    }
  })
);

// @route   GET /api/messages/mentions/:teamId
// @desc    Get messages mentioning the current user
// @access  Private (Team Member)
router.get(
  "/mentions/:teamId",
  requireTeamMembership,
  catchAsync(async (req, res) => {
    try {
      const { page = 1, limit = 20 } = req.query;

      const skip = (page - 1) * limit;

      const messages = await Message.find({
        team: req.params.teamId,
        isDeleted: false,
        "mentions.user": req.user._id,
      })
        .populate("sender", "username firstName lastName avatar")
        .populate("mentions.user", "username firstName lastName avatar")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));

      const total = await Message.countDocuments({
        team: req.params.teamId,
        isDeleted: false,
        "mentions.user": req.user._id,
      });

      res.json({
        success: true,
        data: {
          messages,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / limit),
          },
        },
      });
    } catch (error) {
      logger.error("Get mentions error:", error);
      throw new AppError("Failed to get mentions", 500);
    }
  })
);

// @route   GET /api/messages/stats/:teamId
// @desc    Get message statistics for team
// @access  Private (Team Member)
router.get(
  "/stats/:teamId",
  requireTeamMembership,
  catchAsync(async (req, res) => {
    try {
      const stats = await Message.aggregate([
        { $match: { team: req.params.teamId, isDeleted: false } },
        {
          $group: {
            _id: null,
            totalMessages: { $sum: 1 },
            textMessages: {
              $sum: { $cond: [{ $eq: ["$messageType", "text"] }, 1, 0] },
            },
            fileMessages: {
              $sum: { $cond: [{ $eq: ["$messageType", "file"] }, 1, 0] },
            },
            imageMessages: {
              $sum: { $cond: [{ $eq: ["$messageType", "image"] }, 1, 0] },
            },
            systemMessages: {
              $sum: { $cond: [{ $eq: ["$messageType", "system"] }, 1, 0] },
            },
            totalReactions: { $sum: { $size: "$reactions" } },
            totalMentions: { $sum: { $size: "$mentions" } },
          },
        },
      ]);

      // Get recent activity
      const recentMessages = await Message.find({
        team: req.params.teamId,
        isDeleted: false,
      })
        .populate("sender", "username firstName lastName avatar")
        .sort({ createdAt: -1 })
        .limit(5);

      res.json({
        success: true,
        data: {
          stats: stats[0] || {},
          recentMessages,
        },
      });
    } catch (error) {
      logger.error("Get message stats error:", error);
      throw new AppError("Failed to get message statistics", 500);
    }
  })
);

module.exports = router;
