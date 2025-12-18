const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Team = require("../models/Team");
const TeamInvitation = require("../models/TeamInvitation");
const { authenticateSession } = require("../middleware/auth");

// Send team invitation (organiser -> member)
router.post("/send-invitation", authenticateSession, async (req, res) => {
  try {
    const { teamId, email, message } = req.body;
    const organiserId = req.session.userId;

    if (!teamId || !email) {
      return res.status(400).json({ message: "Team ID and email are required" });
    }

    // Verify the team belongs to the organiser
    const team = await Team.findOne({ _id: teamId, admin: organiserId });
    if (!team) {
      return res.status(403).json({ message: "You can only send invitations for your own teams" });
    }

    // Find the user by email
    const invitedUser = await User.findOne({ email: email.toLowerCase() });
    if (!invitedUser) {
      return res.status(404).json({ message: "User with this email not found" });
    }

    // Check if user is already a member
    if (team.members.includes(invitedUser._id)) {
      return res.status(400).json({ message: "User is already a member of this team" });
    }

    // Check for existing pending invitation
    const existingInvitation = await TeamInvitation.findOne({
      team: teamId,
      invitedUser: invitedUser._id,
      type: "invitation",
      status: "pending",
    });

    if (existingInvitation) {
      return res.status(400).json({ message: "Invitation already sent to this user" });
    }

    // Create new invitation
    const invitation = new TeamInvitation({
      team: teamId,
      invitedBy: organiserId,
      invitedUser: invitedUser._id,
      invitedEmail: email.toLowerCase(),
      type: "invitation",
      message: message || "",
    });

    await invitation.save();
    await invitation.populate(["team", "invitedBy", "invitedUser"]);

    // Emit socket event for real-time notification
    const io = req.app.get("io");
    if (io) {
      io.to(`user_${invitedUser._id}`).emit("team_invitation_received", {
        invitation: invitation,
        teamName: team.name,
        inviterName: req.session.user.name,
      });
    }

    res.json({
      success: true,
      message: "Invitation sent successfully",
      invitation: invitation,
    });

  } catch (error) {
    console.error("Send invitation error:", error);
    res.status(500).json({ message: "Failed to send invitation" });
  }
});

// Send join request (member -> organiser)
router.post("/send-request", authenticateSession, async (req, res) => {
  try {
    const { teamId, message } = req.body;
    const memberId = req.session.userId;

    if (!teamId) {
      return res.status(400).json({ message: "Team ID is required" });
    }

    // Find the team
    const team = await Team.findById(teamId).populate("admin", "email name");
    if (!team) {
      return res.status(404).json({ message: "Team not found" });
    }

    // Check if team has an admin
    if (!team.admin) {
      return res.status(400).json({ message: "This team has no admin. Cannot send join request." });
    }

    // Check if user is already a member
    if (team.members.includes(memberId)) {
      return res.status(400).json({ message: "You are already a member of this team" });
    }

    // Check for existing pending request
    const existingRequest = await TeamInvitation.findOne({
      team: teamId,
      invitedUser: memberId,
      type: "request",
      status: "pending",
    });

    if (existingRequest) {
      return res.status(400).json({ message: "Join request already sent" });
    }

    // Create new join request
    const request = new TeamInvitation({
      team: teamId,
      invitedBy: memberId,
      invitedUser: team.admin._id,
      invitedEmail: team.admin.email,
      type: "request",
      message: message || "",
    });

    await request.save();
    await request.populate(["team", "invitedBy", "invitedUser"]);

    // Emit socket event for real-time notification
    const io = req.app.get("io");
    if (io) {
      io.to(`user_${team.admin._id}`).emit("team_request_received", {
        request: request,
        teamName: team.name,
        requesterName: req.session.user.name,
      });
    }

    res.json({
      success: true,
      message: "Join request sent successfully",
      request: request,
    });

  } catch (error) {
    console.error("Send request error:", error);
    res.status(500).json({ message: "Failed to send join request" });
  }
});

// Accept or reject invitation/request
router.post("/respond", authenticateSession, async (req, res) => {
  try {
    const { invitationId, response } = req.body; // response: 'accept' or 'reject'
    const userId = req.session.userId;

    if (!invitationId || !["accept", "reject"].includes(response)) {
      return res.status(400).json({ message: "Invalid invitation ID or response" });
    }

    const invitation = await TeamInvitation.findById(invitationId)
      .populate(["team", "invitedBy", "invitedUser"]);

    if (!invitation) {
      return res.status(404).json({ message: "Invitation not found" });
    }

    // Verify user has permission to respond
    if (invitation.type === "invitation" && invitation.invitedUser._id.toString() !== userId) {
      return res.status(403).json({ message: "You can only respond to your own invitations" });
    }
    if (invitation.type === "request" && invitation.invitedUser._id.toString() !== userId) {
      return res.status(403).json({ message: "Only team admin can respond to join requests" });
    }

    if (invitation.status !== "pending") {
      return res.status(400).json({ message: "This invitation has already been responded to" });
    }

    // Update invitation status
    invitation.status = response === "accept" ? "accepted" : "rejected";
    invitation.respondedAt = new Date();
    await invitation.save();

    // If accepted, add user to team
    if (response === "accept") {
      const team = await Team.findById(invitation.team._id);
      const memberToAdd = invitation.type === "invitation" ? invitation.invitedUser._id : invitation.invitedBy._id;
            
      if (!team.members.includes(memberToAdd)) {
        team.members.push(memberToAdd);
        await team.save();
      }
    }

    // Emit socket event for real-time notification
    const io = req.app.get("io");
    if (io) {
      const notifyUserId = invitation.type === "invitation" ? invitation.invitedBy._id : invitation.invitedBy._id;
      io.to(`user_${notifyUserId}`).emit("invitation_response", {
        invitation: invitation,
        response: response,
        teamName: invitation.team.name,
      });
    }

    res.json({
      success: true,
      message: `${invitation.type === "invitation" ? "Invitation" : "Request"} ${response}ed successfully`,
      invitation: invitation,
    });

  } catch (error) {
    console.error("Respond to invitation error:", error);
    res.status(500).json({ message: "Failed to respond to invitation" });
  }
});

// Get user's pending invitations
router.get("/my-invitations", authenticateSession, async (req, res) => {
  try {
    const userId = req.session.userId;

    const invitations = await TeamInvitation.find({
      invitedUser: userId,
      type: "invitation",
      status: "pending",
    }).populate(["team", "invitedBy"]).sort({ createdAt: -1 });

    res.json({ invitations });

  } catch (error) {
    console.error("Get invitations error:", error);
    res.status(500).json({ message: "Failed to load invitations" });
  }
});

// Get organiser's pending requests (requests sent by members to join organizer's teams)
router.get("/my-requests", authenticateSession, async (req, res) => {
  try {
    const userId = req.session.userId;

    // Find requests where this user is the team admin (invitedUser) - requests sent TO the organizer
    const requests = await TeamInvitation.find({
      invitedUser: userId,
      type: "request",
      status: "pending",
    }).populate([
      { path: "team", select: "name description" },
      { path: "invitedBy", select: "firstName lastName username email" },
    ]).sort({ createdAt: -1 });

    res.json({ requests });

  } catch (error) {
    console.error("Get requests error:", error);
    res.status(500).json({ message: "Failed to load requests" });
  }
});

// Get member's own pending requests (requests sent by the member to join teams)
router.get("/my-sent-requests", authenticateSession, async (req, res) => {
  try {
    const userId = req.session.userId;

    // Find requests where this user is the one who requested to join (invitedBy)
    const requests = await TeamInvitation.find({
      invitedBy: userId,
      type: "request",
      status: "pending",
    }).populate([
      { path: "team", select: "name description" },
      { path: "invitedUser", select: "firstName lastName username email" },
    ]).sort({ createdAt: -1 });

    res.json({ requests });

  } catch (error) {
    console.error("Get sent requests error:", error);
    res.status(500).json({ message: "Failed to load sent requests" });
  }
});

// Cancel a join request
router.post("/:requestId/cancel", authenticateSession, async (req, res) => {
  try {
    const { requestId } = req.params;
    const userId = req.session.userId;

    // Find the request and verify it belongs to the user
    const request = await TeamInvitation.findOne({
      _id: requestId,
      invitedBy: userId,
      type: "request",
      status: "pending",
    });

    if (!request) {
      return res.status(404).json({ message: "Request not found or you do not have permission to cancel it" });
    }

    // Update the request status to cancelled
    request.status = "cancelled";
    await request.save();

    res.json({
      success: true,
      message: "Request cancelled successfully",
    });

  } catch (error) {
    console.error("Cancel request error:", error);
    res.status(500).json({ message: "Failed to cancel request" });
  }
});

// Get available teams for member to browse
router.get("/available-teams", authenticateSession, async (req, res) => {
  try {
    // Available teams endpoint called
    const userId = req.session.userId;

    // Disable caching
    res.set("Cache-Control", "no-cache, no-store, must-revalidate");
    res.set("Pragma", "no-cache");
    res.set("Expires", "0");

    // Find teams where user is not a member and hasn't sent a request
    const userTeams = await Team.find({ 
      $or: [
        { admin: userId },
        { members: userId },
      ],
    }).select("_id");

    const userTeamIds = userTeams.map(team => team._id);

    // Find pending requests sent by this user
    const pendingRequests = await TeamInvitation.find({
      invitedBy: userId,
      type: "request",
      status: "pending",
    }).select("team");

    const pendingTeamIds = pendingRequests.map(req => req.team);

    // Find available teams
    const availableTeams = await Team.find({
      _id: { $nin: [...userTeamIds, ...pendingTeamIds] },
    }).populate("admin", "username email").select("name description admin createdAt members");
        
    // Add member count to each team
    const teamsWithStats = availableTeams.map(team => ({
      ...team.toObject(),
      memberCount: team.members ? team.members.length : 0,
    }));

    res.json({ teams: teamsWithStats });

  } catch (error) {
    console.error("Get available teams error:", error);
    res.status(500).json({ message: "Failed to load available teams" });
  }
});

module.exports = router;