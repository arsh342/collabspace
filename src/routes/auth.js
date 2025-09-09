const express = require("express");
const { body, validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
const { generateToken } = require("../config/jwt");
const User = require("../models/User");
const { catchAsync, AppError } = require("../middleware/errorHandler");
const logger = require("../middleware/logger");

const router = express.Router();

// Validation middleware
const validateRegistration = [
  body("username")
    .isLength({ min: 3, max: 30 })
    .withMessage("Username must be between 3 and 30 characters")
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage(
      "Username can only contain letters, numbers, underscores, and hyphens"
    ),
  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Please provide a valid email address"),
  body("password")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters long")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage(
      "Password must contain at least one lowercase letter, one uppercase letter, and one number"
    ),
  body("firstName")
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage("First name is required and cannot exceed 50 characters"),
  body("lastName")
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage("Last name is required and cannot exceed 50 characters"),
];

const validateLogin = [
  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Please provide a valid email address"),
  body("password").notEmpty().withMessage("Password is required"),
];

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post(
  "/register",
  validateRegistration,
  catchAsync(async (req, res) => {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: errors.array(),
        });
      }

      const {
        username,
        email,
        password,
        firstName,
        lastName,
        role = "member",
      } = req.body;

      // Check if user already exists
      const existingUser = await User.findOne({
        $or: [{ email }, { username }],
      });

      if (existingUser) {
        if (existingUser.email === email) {
          return res.status(400).json({
            success: false,
            message: "Email is already registered",
          });
        }
        if (existingUser.username === username) {
          return res.status(400).json({
            success: false,
            message: "Username is already taken",
          });
        }
      }

      // Create new user
      const user = new User({
        username,
        email,
        password,
        firstName,
        lastName,
        role,
      });

      // Generate avatar
      try {
        await user.generateAvatar();
      } catch (error) {
        logger.logger.warn(
          "Failed to generate avatar for user:",
          error.message
        );
      }

      await user.save();

      // Generate JWT token
      const token = generateToken(user._id, user.role);

      // Remove password from response
      const userResponse = user.toObject();
      delete userResponse.password;

      logger.logger.info(`New user registered: ${username} (${email})`);

      res.status(201).json({
        success: true,
        message: "User registered successfully",
        data: {
          user: userResponse,
          token,
        },
      });
    } catch (error) {
      logger.logger.error("User registration error:", error);
      throw new AppError("Failed to register user", 500);
    }
  })
);

// @route   POST /api/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post(
  "/login",
  validateLogin,
  catchAsync(async (req, res) => {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: errors.array(),
        });
      }

      const { email, password } = req.body;

      // Find user by email and include password for comparison
      const user = await User.findOne({ email }).select("+password");

      if (!user) {
        return res.status(401).json({
          success: false,
          message: "Invalid credentials",
        });
      }

      // Check if account is locked
      if (user.isLocked()) {
        return res.status(423).json({
          success: false,
          message:
            "Account is temporarily locked due to multiple failed login attempts. Please try again later.",
        });
      }

      // Check if account is active
      if (!user.isActive) {
        return res.status(401).json({
          success: false,
          message: "Account is deactivated",
        });
      }

      // Verify password
      const isPasswordValid = await user.comparePassword(password);

      if (!isPasswordValid) {
        // Increment login attempts
        await user.incLoginAttempts();

        return res.status(401).json({
          success: false,
          message: "Invalid credentials",
        });
      }

      // Reset login attempts on successful login
      if (user.loginAttempts > 0) {
        await user.resetLoginAttempts();
      }

      // Update last seen
      await user.updateLastSeen();

      // Generate JWT token
      const token = generateToken(user._id, user.role);

      // Remove password from response
      const userResponse = user.toObject();
      delete userResponse.password;

      logger.logger.info(`User logged in: ${user.username} (${email})`);

      res.json({
        success: true,
        message: "Login successful",
        data: {
          user: userResponse,
          token,
        },
      });
    } catch (error) {
      logger.logger.error("User login error:", error);
      throw new AppError("Failed to authenticate user", 500);
    }
  })
);

// @route   POST /api/auth/refresh
// @desc    Refresh JWT token
// @access  Public
router.post(
  "/refresh",
  catchAsync(async (req, res) => {
    try {
      const { token } = req.body;

      if (!token) {
        return res.status(400).json({
          success: false,
          message: "Token is required",
        });
      }

      // Verify current token
      const { verifyToken, decodeToken } = require("../config/jwt");
      const decoded = verifyToken(token);

      // Find user
      const user = await User.findById(decoded.userId).select("-password");

      if (!user || !user.isActive) {
        return res.status(401).json({
          success: false,
          message: "Invalid token",
        });
      }

      // Generate new token
      const newToken = generateToken(user._id, user.role);

      logger.logger.info(`Token refreshed for user: ${user.username}`);

      res.json({
        success: true,
        message: "Token refreshed successfully",
        data: {
          user,
          token: newToken,
        },
      });
    } catch (error) {
      logger.logger.error("Token refresh error:", error);
      return res.status(401).json({
        success: false,
        message: "Invalid token",
      });
    }
  })
);

// @route   POST /api/auth/forgot-password
// @desc    Send password reset email
// @access  Public
router.post(
  "/forgot-password",
  [
    body("email")
      .isEmail()
      .normalizeEmail()
      .withMessage("Please provide a valid email address"),
  ],
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

      const { email } = req.body;

      const user = await User.findOne({ email });

      if (!user) {
        // Don't reveal if user exists or not
        return res.json({
          success: true,
          message:
            "If an account with that email exists, a password reset link has been sent",
        });
      }

      // Generate reset token
      const resetToken = require("crypto").randomBytes(32).toString("hex");
      const resetTokenExpiry = Date.now() + 3600000; // 1 hour

      user.passwordResetToken = resetToken;
      user.passwordResetExpires = resetTokenExpiry;
      await user.save();

      // TODO: Send email with reset link
      // For now, just log the token
      logger.logger.info(
        `Password reset token generated for ${email}: ${resetToken}`
      );

      res.json({
        success: true,
        message:
          "If an account with that email exists, a password reset link has been sent",
      });
    } catch (error) {
      logger.logger.error("Forgot password error:", error);
      throw new AppError("Failed to process password reset request", 500);
    }
  })
);

// @route   POST /api/auth/reset-password
// @desc    Reset password with token
// @access  Public
router.post(
  "/reset-password",
  [
    body("token").notEmpty().withMessage("Reset token is required"),
    body("password")
      .isLength({ min: 8 })
      .withMessage("Password must be at least 8 characters long")
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage(
        "Password must contain at least one lowercase letter, one uppercase letter, and one number"
      ),
  ],
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

      const { token, password } = req.body;

      // Find user with valid reset token
      const user = await User.findOne({
        passwordResetToken: token,
        passwordResetExpires: { $gt: Date.now() },
      });

      if (!user) {
        return res.status(400).json({
          success: false,
          message: "Invalid or expired reset token",
        });
      }

      // Update password
      user.password = password;
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      await user.save();

      logger.logger.info(
        `Password reset successful for user: ${user.username}`
      );

      res.json({
        success: true,
        message: "Password has been reset successfully",
      });
    } catch (error) {
      logger.logger.error("Reset password error:", error);
      throw new AppError("Failed to reset password", 500);
    }
  })
);

// @route   POST /api/auth/verify-email
// @desc    Verify email address
// @access  Public
router.post(
  "/verify-email",
  [body("token").notEmpty().withMessage("Verification token is required")],
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

      const { token } = req.body;

      // Find user with valid verification token
      const user = await User.findOne({
        emailVerificationToken: token,
        emailVerificationExpires: { $gt: Date.now() },
      });

      if (!user) {
        return res.status(400).json({
          success: false,
          message: "Invalid or expired verification token",
        });
      }

      // Mark email as verified
      user.emailVerified = true;
      user.emailVerificationToken = undefined;
      user.emailVerificationExpires = undefined;
      await user.save();

      logger.logger.info(`Email verified for user: ${user.username}`);

      res.json({
        success: true,
        message: "Email has been verified successfully",
      });
    } catch (error) {
      logger.logger.error("Email verification error:", error);
      throw new AppError("Failed to verify email", 500);
    }
  })
);

// @route   GET /api/auth/me
// @desc    Get current user profile
// @access  Private
router.get("/me", async (req, res) => {
  try {
    // This route should be protected by auth middleware
    // For now, we'll check if user is in request
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const user = await User.findById(req.user._id).select("-password");

    res.json({
      success: true,
      data: {
        user,
      },
    });
  } catch (error) {
    logger.logger.error("Get user profile error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get user profile",
    });
  }
});

module.exports = router;
