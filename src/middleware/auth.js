const User = require("../models/User");
const { logger } = require("./logger");

// Session-based authentication middleware for API routes
const authenticateSession = async (req, res, next) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const user = await User.findById(req.session.userId).select("-password");

    if (!user) {
      // User not found - destroy session
      req.session.destroy((err) => {
        if (err) logger.error("Session destruction error:", err);
      });
      return res.status(401).json({
        success: false,
        message: "Invalid session - user not found",
      });
    }

    // Check if user is active
    if (!user.isActive) {
      // User deactivated - destroy session
      req.session.destroy((err) => {
        if (err) logger.error("Session destruction error:", err);
      });
      return res.status(401).json({
        success: false,
        message: "Account is deactivated",
      });
    }

    // Update last seen timestamp for persistent sessions
    if (req.session.persistent) {
      try {
        await user.updateLastSeen();
      } catch (error) {
        logger.error("Failed to update user last seen:", error);
      }
    }

    req.user = user;
    next();
  } catch (error) {
    logger.error("Authentication error:", error);
    return res.status(500).json({
      success: false,
      message: "Authentication error",
    });
  }
};

// Session-based authentication middleware for web routes (redirects to login)
const authenticateWeb = async (req, res, next) => {
  try {
    console.log("🔍 Web session debug:", {
      sessionId: req.sessionID,
      userId: req.session.userId,
      sessionExists: !!req.session,
      persistent: req.session.persistent,
      cookies: req.headers.cookie,
    });

    if (!req.session.userId) {
      console.log("❌ No userId in session, redirecting to login");
      return res.redirect("/login");
    }

    const user = await User.findById(req.session.userId).select("-password");

    if (!user) {
      console.log("❌ User not found, destroying session");
      req.session.destroy((err) => {
        if (err) logger.error("Session destruction error:", err);
      });
      return res.redirect("/login");
    }

    // Check if user is active
    if (!user.isActive) {
      console.log("❌ User inactive, destroying session");
      req.session.destroy((err) => {
        if (err) logger.error("Session destruction error:", err);
      });
      return res.redirect("/login");
    }

    // Update last seen timestamp for persistent sessions
    if (req.session.persistent) {
      try {
        await user.updateLastSeen();
        console.log(
          "✅ Updated last seen for persistent session user:",
          user.email
        );
      } catch (error) {
        logger.error("Failed to update user last seen:", error);
      }
    }

    console.log("✅ Web authentication successful for user:", user.email);
    req.user = user;
    next();
  } catch (error) {
    logger.error("Authentication error:", error);
    return res.redirect("/login");
  }
};

// Role-based access control middleware for API routes
const requireOrganiser = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (req.user.role !== "Organiser") {
      return res.status(403).json({
        success: false,
        message: "Organiser access required",
      });
    }

    next();
  } catch (error) {
    logger.error("Authorization error:", error);
    return res.status(500).json({
      success: false,
      message: "Authorization error",
    });
  }
};

// Role-based access control middleware for web routes
const requireOrganiserWeb = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.redirect("/login");
    }

    if (req.user.role !== "Organiser") {
      return res.status(403).send("Organiser access required");
    }

    next();
  } catch (error) {
    logger.error("Authorization error:", error);
    return res.redirect("/login");
  }
};

const requireTeamMember = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (req.user.role !== "Team Member") {
      return res.status(403).json({
        success: false,
        message: "Team Member access required",
      });
    }

    next();
  } catch (error) {
    logger.error("Authorization error:", error);
    return res.status(500).json({
      success: false,
      message: "Authorization error",
    });
  }
};

// Web version for team member access
const requireTeamMemberWeb = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.redirect("/login");
    }

    if (req.user.role !== "Team Member") {
      return res.status(403).send("Team Member access required");
    }

    next();
  } catch (error) {
    logger.error("Authorization error:", error);
    return res.redirect("/login");
  }
};

// Middleware for routes that require any authenticated user
const requireAuth = authenticateSession;

// Team membership verification middleware
const requireTeamMembership = async (req, res, next) => {
  // First authenticate the user
  try {
    await authenticateSession(req, res, async () => {
      try {
        const teamId = req.params.teamId || req.params.id;

        if (!teamId) {
          return res.status(400).json({
            success: false,
            message: "Team ID is required",
          });
        }

        const Team = require("../models/Team");
        const team = await Team.findById(teamId);

        if (!team) {
          return res.status(404).json({
            success: false,
            message: "Team not found",
          });
        }

        // Check if user is a member of the team or the admin
        const isMember = team.members.includes(req.user._id);
        const isAdmin = team.admin.toString() === req.user._id.toString();

        if (!isMember && !isAdmin) {
          return res.status(403).json({
            success: false,
            message: "You are not a member of this team",
          });
        }

        req.team = team;
        req.isTeamAdmin = isAdmin;
        next();
      } catch (error) {
        logger.error("Team membership verification error:", error);
        return res.status(500).json({
          success: false,
          message: "Internal server error",
        });
      }
    });
  } catch (error) {
    // Authentication failed, error already sent by authenticateSession
    return;
  }
};

// Team organiser verification middleware
const requireTeamOrganiser = async (req, res, next) => {
  // First authenticate the user
  try {
    await authenticateSession(req, res, async () => {
      try {
        const teamId = req.params.teamId || req.params.id;

        if (!teamId) {
          return res.status(400).json({
            success: false,
            message: "Team ID is required",
          });
        }

        const Team = require("../models/Team");
        const team = await Team.findById(teamId);

        if (!team) {
          return res.status(404).json({
            success: false,
            message: "Team not found",
          });
        }

        // Check if user is the admin of the team
        if (team.admin.toString() !== req.user._id.toString()) {
          return res.status(403).json({
            success: false,
            message: "Only team admin can perform this action",
          });
        }

        req.team = team;
        next();
      } catch (error) {
        logger.error("Team organiser verification error:", error);
        return res.status(500).json({
          success: false,
          message: "Internal server error",
        });
      }
    });
  } catch (error) {
    // Authentication failed, error already sent by authenticateSession
    return;
  }
};

module.exports = {
  authenticateSession,
  authenticateWeb,
  requireAuth,
  requireOrganiser,
  requireOrganiserWeb,
  requireTeamMember,
  requireTeamMemberWeb,
  requireTeamMembership,
  requireTeamOrganiser,
};
