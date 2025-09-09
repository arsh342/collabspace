const express = require("express");
const { body, validationResult } = require("express-validator");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const User = require("../models/User");
const { catchAsync, AppError } = require("../middleware/errorHandler");
const { requireAdmin, requireMember } = require("../middleware/auth");
const logger = require("../middleware/logger");

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
    cb(
      null,
      file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname)
    );
  },
});

const fileFilter = (req, file, cb) => {
  // Allow only image files
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed"), false);
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
const validateUserUpdate = [
  body("firstName")
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage("First name must be between 1 and 50 characters"),
  body("lastName")
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage("Last name must be between 1 and 50 characters"),
  body("bio")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Bio cannot exceed 500 characters"),
  body("email")
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage("Please provide a valid email address"),
];

const validatePasswordChange = [
  body("currentPassword")
    .notEmpty()
    .withMessage("Current password is required"),
  body("newPassword")
    .isLength({ min: 8 })
    .withMessage("New password must be at least 8 characters long")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage(
      "New password must contain at least one lowercase letter, one uppercase letter, and one number"
    ),
];

// @route   GET /api/users
// @desc    Get all users (admin only)
// @access  Private (Admin)
router.get(
  "/",
  requireAdmin,
  catchAsync(async (req, res) => {
    try {
      const { page = 1, limit = 20, search, role, isActive } = req.query;

      const query = {};

      if (search) {
        query.$or = [
          { username: { $regex: search, $options: "i" } },
          { firstName: { $regex: search, $options: "i" } },
          { lastName: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
        ];
      }

      if (role) query.role = role;
      if (isActive !== undefined) query.isActive = isActive === "true";

      const skip = (page - 1) * limit;

      const users = await User.find(query)
        .select("-password")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));

      const total = await User.countDocuments(query);

      res.json({
        success: true,
        data: {
          users,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / limit),
          },
        },
      });
    } catch (error) {
      logger.error("Get users error:", error);
      throw new AppError("Failed to get users", 500);
    }
  })
);

// @route   GET /api/users/search
// @desc    Search users
// @access  Private
router.get(
  "/search",
  requireMember,
  catchAsync(async (req, res) => {
    try {
      const { q, excludeCurrentUser = true } = req.query;

      if (!q || q.length < 2) {
        return res.status(400).json({
          success: false,
          message: "Search query must be at least 2 characters long",
        });
      }

      const excludeUserId = excludeCurrentUser === "true" ? req.user._id : null;
      const users = await User.searchUsers(q, excludeUserId);

      res.json({
        success: true,
        data: { users },
      });
    } catch (error) {
      logger.error("Search users error:", error);
      throw new AppError("Failed to search users", 500);
    }
  })
);

// @route   GET /api/users/:id
// @desc    Get user by ID
// @access  Private
router.get(
  "/:id",
  requireMember,
  catchAsync(async (req, res) => {
    try {
      const user = await User.findById(req.params.id).select("-password");

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      res.json({
        success: true,
        data: { user },
      });
    } catch (error) {
      logger.error("Get user error:", error);
      throw new AppError("Failed to get user", 500);
    }
  })
);

// @route   GET /api/users/profile/me
// @desc    Get current user profile
// @access  Private
router.get(
  "/profile/me",
  requireMember,
  catchAsync(async (req, res) => {
    try {
      const user = await User.findById(req.user._id).select("-password");

      res.json({
        success: true,
        data: { user },
      });
    } catch (error) {
      logger.error("Get profile error:", error);
      throw new AppError("Failed to get profile", 500);
    }
  })
);

// @route   PUT /api/users/profile/me
// @desc    Update current user profile
// @access  Private
router.put(
  "/profile/me",
  validateUserUpdate,
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

      const { firstName, lastName, bio, email } = req.body;

      // Check if email is being changed and if it's already taken
      if (email && email !== req.user.email) {
        const existingUser = await User.findOne({
          email,
          _id: { $ne: req.user._id },
        });
        if (existingUser) {
          return res.status(400).json({
            success: false,
            message: "Email is already taken by another user",
          });
        }
      }

      const user = await User.findByIdAndUpdate(
        req.user._id,
        { firstName, lastName, bio, email },
        { new: true, runValidators: true }
      ).select("-password");

      logger.info(`User ${req.user.username} updated their profile`);

      res.json({
        success: true,
        message: "Profile updated successfully",
        data: { user },
      });
    } catch (error) {
      logger.error("Update profile error:", error);
      throw new AppError("Failed to update profile", 500);
    }
  })
);

// @route   PUT /api/users/profile/avatar
// @desc    Update user avatar
// @access  Private
router.put(
  "/profile/avatar",
  upload.single("avatar"),
  catchAsync(async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "Avatar file is required",
        });
      }

      const user = await User.findById(req.user._id);

      // Delete old avatar file if it exists
      if (user.avatar && user.avatar.startsWith("./uploads/")) {
        try {
          fs.unlinkSync(user.avatar);
        } catch (error) {
          logger.warn("Failed to delete old avatar file:", error.message);
        }
      }

      // Update avatar path
      user.avatar = req.file.path;
      await user.save();

      logger.info(`User ${req.user.username} updated their avatar`);

      res.json({
        success: true,
        message: "Avatar updated successfully",
        data: { avatar: user.avatar },
      });
    } catch (error) {
      logger.error("Update avatar error:", error);
      throw new AppError("Failed to update avatar", 500);
    }
  })
);

// @route   PUT /api/users/profile/password
// @desc    Change user password
// @access  Private
router.put(
  "/profile/password",
  validatePasswordChange,
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

      const { currentPassword, newPassword } = req.body;

      const user = await User.findById(req.user._id).select("+password");

      // Verify current password
      const isCurrentPasswordValid = await user.comparePassword(
        currentPassword
      );
      if (!isCurrentPasswordValid) {
        return res.status(400).json({
          success: false,
          message: "Current password is incorrect",
        });
      }

      // Update password
      user.password = newPassword;
      await user.save();

      logger.info(`User ${req.user.username} changed their password`);

      res.json({
        success: true,
        message: "Password changed successfully",
      });
    } catch (error) {
      logger.error("Change password error:", error);
      throw new AppError("Failed to change password", 500);
    }
  })
);

// @route   PUT /api/users/:id
// @desc    Update user (admin only)
// @access  Private (Admin)
router.put(
  "/:id",
  requireAdmin,
  validateUserUpdate,
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

      const { firstName, lastName, bio, email, role, isActive } = req.body;

      // Check if email is being changed and if it's already taken
      if (email) {
        const existingUser = await User.findOne({
          email,
          _id: { $ne: req.params.id },
        });
        if (existingUser) {
          return res.status(400).json({
            success: false,
            message: "Email is already taken by another user",
          });
        }
      }

      const updateData = { firstName, lastName, bio, email, role, isActive };

      // Remove undefined fields
      Object.keys(updateData).forEach(
        (key) => updateData[key] === undefined && delete updateData[key]
      );

      const user = await User.findByIdAndUpdate(req.params.id, updateData, {
        new: true,
        runValidators: true,
      }).select("-password");

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      logger.info(`Admin ${req.user.username} updated user ${user.username}`);

      res.json({
        success: true,
        message: "User updated successfully",
        data: { user },
      });
    } catch (error) {
      logger.error("Update user error:", error);
      throw new AppError("Failed to update user", 500);
    }
  })
);

// @route   DELETE /api/users/:id
// @desc    Delete user (admin only)
// @access  Private (Admin)
router.delete(
  "/:id",
  requireAdmin,
  catchAsync(async (req, res) => {
    try {
      // Prevent admin from deleting themselves
      if (req.params.id === req.user._id.toString()) {
        return res.status(400).json({
          success: false,
          message: "Cannot delete your own account",
        });
      }

      const user = await User.findById(req.params.id);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      // Check if user is admin
      if (user.role === "admin") {
        return res.status(400).json({
          success: false,
          message: "Cannot delete admin users",
        });
      }

      await User.findByIdAndDelete(req.params.id);

      logger.info(`Admin ${req.user.username} deleted user ${user.username}`);

      res.json({
        success: true,
        message: "User deleted successfully",
      });
    } catch (error) {
      logger.error("Delete user error:", error);
      throw new AppError("Failed to delete user", 500);
    }
  })
);

// @route   POST /api/users/:id/deactivate
// @desc    Deactivate user (admin only)
// @access  Private (Admin)
router.post(
  "/:id/deactivate",
  requireAdmin,
  catchAsync(async (req, res) => {
    try {
      // Prevent admin from deactivating themselves
      if (req.params.id === req.user._id.toString()) {
        return res.status(400).json({
          success: false,
          message: "Cannot deactivate your own account",
        });
      }

      const user = await User.findByIdAndUpdate(
        req.params.id,
        { isActive: false },
        { new: true }
      ).select("-password");

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      logger.info(
        `Admin ${req.user.username} deactivated user ${user.username}`
      );

      res.json({
        success: true,
        message: "User deactivated successfully",
        data: { user },
      });
    } catch (error) {
      logger.error("Deactivate user error:", error);
      throw new AppError("Failed to deactivate user", 500);
    }
  })
);

// @route   POST /api/users/:id/activate
// @desc    Activate user (admin only)
// @access  Private (Admin)
router.post(
  "/:id/activate",
  requireAdmin,
  catchAsync(async (req, res) => {
    try {
      const user = await User.findByIdAndUpdate(
        req.params.id,
        { isActive: true },
        { new: true }
      ).select("-password");

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      logger.info(`Admin ${req.user.username} activated user ${user.username}`);

      res.json({
        success: true,
        message: "User activated successfully",
        data: { user },
      });
    } catch (error) {
      logger.error("Activate user error:", error);
      throw new AppError("Failed to activate user", 500);
    }
  })
);

// @route   GET /api/users/stats/overview
// @desc    Get user statistics overview (admin only)
// @access  Private (Admin)
router.get(
  "/stats/overview",
  requireAdmin,
  catchAsync(async (req, res) => {
    try {
      const stats = await User.aggregate([
        {
          $group: {
            _id: null,
            totalUsers: { $sum: 1 },
            activeUsers: { $sum: { $cond: ["$isActive", 1, 0] } },
            adminUsers: {
              $sum: { $cond: [{ $eq: ["$role", "admin"] }, 1, 0] },
            },
            memberUsers: {
              $sum: { $cond: [{ $eq: ["$role", "member"] }, 1, 0] },
            },
            verifiedEmails: { $sum: { $cond: ["$emailVerified", 1, 0] } },
            recentRegistrations: {
              $sum: {
                $cond: [
                  {
                    $gte: [
                      "$createdAt",
                      new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
          },
        },
      ]);

      res.json({
        success: true,
        data: { stats: stats[0] || {} },
      });
    } catch (error) {
      logger.error("Get user stats error:", error);
      throw new AppError("Failed to get user statistics", 500);
    }
  })
);

module.exports = router;
