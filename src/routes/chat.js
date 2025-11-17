const express = require("express");
const { body, validationResult } = require("express-validator");
const Message = require("../models/Message");
const Team = require("../models/Team");
const User = require("../models/User");
const { catchAsync, AppError } = require("../middleware/errorHandler");
const { authenticateSession } = require("../middleware/auth");
const { logger } = require("../middleware/logger");

const router = express.Router();

// Validation middleware
const validateMessage = [
  body("content")
    .trim()
    .custom((value, { req }) => {
      // Allow empty content for file/image/voice messages
      if (["file", "image", "voice"].includes(req.body.messageType)) {
        if (req.body.messageType === "file") {
          // Require file metadata for file messages
          if (!req.body.fileName || !req.body.fileUrl) {
            throw new Error(
              "fileName and fileUrl are required for file messages",
            );
          }
        }
        return true;
      }
      if (!value || value.length < 1) {
        throw new Error("Message content is required for text messages");
      }
      if (value.length > 2000) {
        throw new Error(
          "Message content must be between 1 and 2000 characters",
        );
      }
      return true;
    }),
  body("teamId").isMongoId().withMessage("Valid team ID is required"),
  body("messageType")
    .optional()
    .isIn(["text", "file", "image", "voice", "system"])
    .withMessage(
      "Message type must be one of: text, file, image, voice, system",
    ),
];

// @route   GET /api/chat/conversations
// @desc    Get user's chat conversations (teams and direct messages)
// @access  Private
router.get(
  "/conversations",
  authenticateSession,
  catchAsync(async (req, res) => {
    try {
      // Get teams where user is a member
      const teams = await Team.find({
        members: req.user._id,
      })
        .populate("members", "username email avatar")
        .sort({ updatedAt: -1 });

      const conversations = teams.map((team) => {
        const onlineMembers = team.members.filter(
          (member) => member.isOnline || false, // Assuming we track online status
        ).length;

        return {
          id: team._id,
          name: team.name,
          type: "group",
          avatar: team.avatar || null,
          lastMessage: null, // We'll fetch this separately if needed
          members: team.members.length,
          onlineMembers: onlineMembers,
          unreadCount: 0, // TODO: Implement unread count logic
          lastActivity: team.updatedAt,
        };
      });

      res.json({
        success: true,
        conversations,
      });
    } catch (error) {
      logger.error("Error fetching conversations:", error);
      res.status(500).json({
        success: false,
        message: "Error fetching conversations",
      });
    }
  }),
);

// @route   GET /api/chat/messages/:conversationId
// @desc    Get messages for a conversation
// @access  Private
router.get(
  "/messages/:conversationId",
  authenticateSession,
  catchAsync(async (req, res) => {
    const { conversationId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    // Check if user has access to this conversation
    const team = await Team.findOne({
      _id: conversationId,
      members: req.user._id,
    });

    if (!team) {
      return res.status(403).json({
        success: false,
        message: "Access denied to this conversation",
      });
    }

    const messages = await Message.find({
      team: conversationId,
      isDeleted: false,
    })
      .populate("sender", "username firstName lastName avatar email lastSeen")
      .populate("replyTo.sender", "username firstName lastName avatar lastSeen")
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const formattedMessages = messages.reverse().map((message) => {
      return {
        _id: message._id,
        content: message.content,
        messageType: message.messageType,
        sender: {
          _id: message.sender._id,
          username: message.sender.username,
          firstName: message.sender.firstName,
          lastName: message.sender.lastName,
          avatar:
            message.sender.avatar ||
            `https://ui-avatars.com/api/?name=${message.sender.username}&background=7B61FF&color=fff`,
        },
        createdAt: message.createdAt,
        updatedAt: message.updatedAt,
        timestamp: message.createdAt.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        }),
        status: "delivered", // TODO: Implement read status
        attachments: message.attachments || [],
        reactions: message.reactions || [],
        replyTo: message.replyTo || null,
        isEdited: message.isEdited,
        editedAt: message.editedAt,
        // Include file data
        fileName: message.fileName,
        fileType: message.fileType,
        fileSize: message.fileSize,
        fileUrl: message.fileUrl,
      };
    });

    res.json({
      success: true,
      messages: formattedMessages,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: await Message.countDocuments({
          team: conversationId,
          isDeleted: false,
        }),
      },
    });
  }),
);

// @route   POST /api/chat/messages
// @desc    Send a new message
// @access  Private
router.post(
  "/messages",
  authenticateSession,
  validateMessage,
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

      const {
        content,
        teamId,
        messageType = "text",
        replyTo,
        fileName,
        fileType,
        fileSize,
        fileUrl,
      } = req.body;

      // Check if user has access to this team
      const team = await Team.findOne({
        _id: teamId,
        members: req.user._id,
      });

      if (!team) {
        return res.status(403).json({
          success: false,
          message: "Access denied to this team",
        });
      }

      // Create the message
      const messageData = {
        team: teamId,
        sender: req.user._id,
        content,
        messageType,
        replyTo: replyTo ? { message: replyTo } : undefined,
      };

      // Add file data if this is a file message
      if (messageType === "file" && fileName) {
        messageData.fileName = fileName;
        messageData.fileType = fileType;
        messageData.fileSize = fileSize;
        messageData.fileUrl = fileUrl;
      }

      const message = new Message(messageData);

      await message.save();

      // Update team's last activity and last message
      team.lastActivity = new Date();
      team.lastMessage = message._id;
      await team.save();

      // Populate the message for response
      await message.populate(
        "sender",
        "username firstName lastName avatar email",
      );
      if (replyTo) {
        await message.populate(
          "replyTo.sender",
          "username firstName lastName avatar",
        );
      }

      const formattedMessage = {
        _id: message._id,
        content: message.content,
        messageType: message.messageType,
        sender: {
          _id: message.sender._id,
          username: message.sender.username,
          firstName: message.sender.firstName,
          lastName: message.sender.lastName,
          avatar:
            message.sender.avatar ||
            `https://ui-avatars.com/api/?name=${message.sender.username}&background=7B61FF&color=fff`,
        },
        team: teamId,
        teamId: teamId,
        createdAt: message.createdAt,
        timestamp: message.createdAt.toISOString(),
        status: "delivered",
        attachments: message.attachments || [],
        reactions: message.reactions || [],
        replyTo: message.replyTo || null,
        isEdited: false,
        // Include file data if it's a file message
        fileName: message.fileName,
        fileType: message.fileType,
        fileSize: message.fileSize,
        fileUrl: message.fileUrl,
      };

      // Emit to Socket.IO for real-time updates
      if (req.io) {
        req.io.to(`team-${teamId}`).emit("new message", formattedMessage);
      }

      res.status(201).json({
        success: true,
        message: formattedMessage,
      });
    } catch (error) {
      logger.error("Error sending message:", error);
      res.status(500).json({
        success: false,
        message: "Error sending message",
      });
    }
  }),
);

// @route   PUT /api/chat/messages/:messageId
// @desc    Edit a message
// @access  Private
router.put(
  "/messages/:messageId",
  authenticateSession,
  catchAsync(async (req, res) => {
    try {
      const { messageId } = req.params;
      const { content } = req.body;

      if (!content || content.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: "Message content is required",
        });
      }

      const message = await Message.findOne({
        _id: messageId,
        sender: req.user._id,
        isDeleted: false,
      });

      if (!message) {
        return res.status(404).json({
          success: false,
          message: "Message not found or access denied",
        });
      }

      message.content = content.trim();
      message.isEdited = true;
      message.editedAt = new Date();
      await message.save();

      await message.populate("sender", "username avatar email");

      const formattedMessage = {
        id: message._id,
        content: message.content,
        type: message.messageType,
        sender: {
          id: message.sender._id,
          name: message.sender.username,
          avatar:
            message.sender.avatar ||
            `https://ui-avatars.com/api/?name=${message.sender.username}&background=7B61FF&color=fff`,
        },
        timestamp: message.createdAt.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        }),
        status: "delivered",
        isEdited: true,
        editedAt: message.editedAt,
      };

      res.json({
        success: true,
        message: formattedMessage,
      });
    } catch (error) {
      logger.error("Error editing message:", error);
      res.status(500).json({
        success: false,
        message: "Error editing message",
      });
    }
  }),
);

// @route   DELETE /api/chat/messages/:messageId
// @desc    Delete a message
// @access  Private
router.delete(
  "/messages/:messageId",
  authenticateSession,
  catchAsync(async (req, res) => {
    try {
      const { messageId } = req.params;

      const message = await Message.findOne({
        _id: messageId,
        sender: req.user._id,
        isDeleted: false,
      });

      if (!message) {
        return res.status(404).json({
          success: false,
          message: "Message not found or access denied",
        });
      }

      message.isDeleted = true;
      message.deletedAt = new Date();
      message.deletedBy = req.user._id;
      await message.save();

      res.json({
        success: true,
        message: "Message deleted successfully",
      });
    } catch (error) {
      logger.error("Error deleting message:", error);
      res.status(500).json({
        success: false,
        message: "Error deleting message",
      });
    }
  }),
);

// @route   POST /api/chat/messages/:messageId/reaction
// @desc    Add or remove reaction to a message
// @access  Private
router.post(
  "/messages/:messageId/reaction",
  authenticateSession,
  catchAsync(async (req, res) => {
    try {
      const { messageId } = req.params;
      const { emoji } = req.body;

      if (!emoji) {
        return res.status(400).json({
          success: false,
          message: "Emoji is required",
        });
      }

      const message = await Message.findById(messageId);
      if (!message) {
        return res.status(404).json({
          success: false,
          message: "Message not found",
        });
      }

      // Check if user already reacted with this emoji
      const existingReactionIndex = message.reactions.findIndex(
        (reaction) =>
          reaction.user.toString() === req.user._id.toString() &&
          reaction.emoji === emoji,
      );

      if (existingReactionIndex > -1) {
        // Remove existing reaction
        message.reactions.splice(existingReactionIndex, 1);
      } else {
        // Add new reaction
        message.reactions.push({
          user: req.user._id,
          emoji,
          createdAt: new Date(),
        });
      }

      await message.save();

      res.json({
        success: true,
        reactions: message.reactions,
      });
    } catch (error) {
      logger.error("Error managing reaction:", error);
      res.status(500).json({
        success: false,
        message: "Error managing reaction",
      });
    }
  }),
);

// @route   GET /api/chat/team/:teamId/members
// @desc    Get team members for chat
// @access  Private
router.get(
  "/team/:teamId/members",
  authenticateSession,
  catchAsync(async (req, res) => {
    try {
      const { teamId } = req.params;

      const team = await Team.findOne({
        _id: teamId,
        members: req.user._id,
      })
        .populate("members", "username email avatar isOnline lastSeen")
        .populate("owner", "username email avatar");

      if (!team) {
        return res.status(403).json({
          success: false,
          message: "Access denied to this team",
        });
      }

      const members = team.members.map((member) => ({
        id: member._id,
        name: member.username,
        email: member.email,
        avatar:
          member.avatar ||
          `https://ui-avatars.com/api/?name=${member.username}&background=7B61FF&color=fff`,
        online: member.isOnline || false,
        lastSeen: member.lastSeen,
        role:
          member._id.toString() === team.owner._id.toString()
            ? "admin"
            : "member",
      }));

      res.json({
        success: true,
        members,
      });
    } catch (error) {
      logger.error("Error fetching team members:", error);
      res.status(500).json({
        success: false,
        message: "Error fetching team members",
      });
    }
  }),
);

module.exports = router;
