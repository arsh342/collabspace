const { verifyToken } = require("../config/jwt");
const User = require("../models/User");
const { logger } = require("./logger");

const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Access token required",
      });
    }

    const decoded = verifyToken(token);
    const user = await User.findById(decoded.userId).select("-password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid token - user not found",
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: "Account is deactivated",
      });
    }

    req.user = user;
    req.token = decoded;
    next();
  } catch (error) {
    logger.error("Authentication error:", error);

    if (error.message === "Token has expired") {
      return res.status(401).json({
        success: false,
        message: "Token has expired",
      });
    }

    return res.status(401).json({
      success: false,
      message: "Invalid token",
    });
  }
};

const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const userRole = req.user.role;

    if (Array.isArray(roles)) {
      if (!roles.includes(userRole)) {
        return res.status(403).json({
          success: false,
          message: "Insufficient permissions",
        });
      }
    } else {
      if (userRole !== roles) {
        return res.status(403).json({
          success: false,
          message: "Insufficient permissions",
        });
      }
    }

    next();
  };
};

const requireAdmin = requireRole("admin");
const requireMember = requireRole(["admin", "member"]);

const requireTeamMember = async (req, res, next) => {
  try {
    const { teamId } = req.params;

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

    // Check if user is a member of the team
    if (!team.members.includes(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: "You are not a member of this team",
      });
    }

    req.team = team;
    next();
  } catch (error) {
    logger.error("Team membership verification error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const requireTeamAdmin = async (req, res, next) => {
  try {
    const { teamId } = req.params;

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
    logger.error("Team admin verification error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

module.exports = {
  authenticateToken,
  requireRole,
  requireAdmin,
  requireMember,
  requireTeamMember,
  requireTeamAdmin,
};
