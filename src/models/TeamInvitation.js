const mongoose = require("mongoose");

const teamInvitationSchema = new mongoose.Schema({
  team: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Team",
    required: true,
  },
  invitedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  invitedUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  invitedEmail: {
    type: String,
    required: true,
    lowercase: true,
  },
  type: {
    type: String,
    enum: ["invitation", "request"], // invitation: organiser -> member, request: member -> organiser
    required: true,
  },
  status: {
    type: String,
    enum: ["pending", "accepted", "rejected", "cancelled"],
    default: "pending",
  },
  message: {
    type: String,
    default: "",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  respondedAt: {
    type: Date,
  },
}, {
  timestamps: true,
});

// Compound index to prevent duplicate invitations
teamInvitationSchema.index({ team: 1, invitedUser: 1, type: 1, status: 1 });

// Index for faster queries
teamInvitationSchema.index({ invitedUser: 1, status: 1 });
teamInvitationSchema.index({ invitedBy: 1, status: 1 });
teamInvitationSchema.index({ team: 1, status: 1 });

module.exports = mongoose.model("TeamInvitation", teamInvitationSchema);