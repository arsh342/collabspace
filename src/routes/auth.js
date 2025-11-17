const express = require("express");
const { body, validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const { catchAsync, AppError } = require("../middleware/errorHandler");
const logger = require("../middleware/logger");
const { authenticateSession } = require("../middleware/auth");
const { verifyIdToken } = require("../config/firebase");

const router = express.Router();

// Validation middleware
const validateRegistration = [
  body("username")
    .isLength({ min: 3, max: 30 })
    .withMessage("Username must be between 3 and 30 characters")
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage(
      "Username can only contain letters, numbers, underscores, and hyphens",
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
      "Password must contain at least one lowercase letter, one uppercase letter, and one number",
    ),
  body("firstName")
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage("First name is required and cannot exceed 50 characters"),
  body("lastName")
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage("Last name is required and cannot exceed 50 characters"),
  body("role")
    .isIn(["Organiser", "Team Member"])
    .withMessage("Role must be either 'Organiser' or 'Team Member'"),
];

const validateLogin = [
  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Please provide a valid email address"),
  body("password").notEmpty().withMessage("Password is required"),
  body("rememberMe")
    .optional()
    .isBoolean()
    .withMessage("Remember me must be a boolean"),
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

      const { username, email, password, firstName, lastName, role } = req.body;

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
          error.message,
        );
      }

      await user.save();

      // Create session
      req.session.userId = user._id;
      req.session.role = user.role;

      // Remove password from response
      const userResponse = user.toObject();
      delete userResponse.password;

      logger.logger.info(`New user registered: ${username} (${email})`);

      res.status(201).json({
        success: true,
        message: "User registered successfully",
        data: {
          user: userResponse,
        },
      });
    } catch (error) {
      logger.logger.error("User registration error:", error);
      throw new AppError("Failed to register user", 500);
    }
  }),
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

      const { email, password, rememberMe } = req.body;

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

      // Create session
      req.session.userId = user._id;
      req.session.role = user.role;

      // Set cookie options based on "Remember Me" choice
      if (rememberMe) {
        // Extend session for 30 days if "Remember Me" is checked
        req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
        req.session.persistent = true;
        logger.logger.info(
          `Extended session for user: ${user.email} (Remember Me: enabled)`,
        );
      } else {
        // Standard session for 24 hours
        req.session.cookie.maxAge = 24 * 60 * 60 * 1000; // 24 hours
        req.session.persistent = false;
        logger.logger.info(
          `Standard session for user: ${user.email} (Remember Me: disabled)`,
        );
      }

      // Force session save to ensure persistence
      await new Promise((resolve, reject) => {
        req.session.save((err) => {
          if (err) {
            console.error("Session save error:", err);
            reject(err);
          } else {
            console.log("✅ Session saved successfully for user:", user.email);
            resolve();
          }
        });
      });

      // Remove password from response
      const userResponse = user.toObject();
      delete userResponse.password;

      logger.logger.info(`User logged in: ${user.username} (${email})`);

      // Determine redirect URL based on role
      let redirectUrl = "/dashboard"; // default
      if (user.role === "Organiser") {
        redirectUrl = "/organiser-dashboard";
      } else if (user.role === "Team Member") {
        redirectUrl = "/member-dashboard";
      }

      res.json({
        success: true,
        message: "Login successful",
        data: {
          user: userResponse,
          redirectUrl,
          sessionId: req.sessionID, // Include session ID for debugging
        },
      });
    } catch (error) {
      logger.logger.error("User login error:", error);
      throw new AppError("Failed to authenticate user", 500);
    }
  }),
);

// @route   POST /api/auth/firebase
// @desc    Login or register via Firebase Google ID token
// @access  Public
router.post(
  "/firebase",
  catchAsync(async (req, res) => {
    try {
      const { idToken, role, plan } = req.body || {};
      if (!idToken) {
        return res.status(400).json({
          success: false,
          message: "idToken is required",
        });
      }

      const decoded = await verifyIdToken(idToken);
      if (!decoded) {
        return res.status(401).json({
          success: false,
          message: "Invalid or expired ID token",
        });
      }

      // Extract fields
      const email = decoded.email;
      const emailVerified = decoded.email_verified;
      const uid = decoded.uid;
      const name = decoded.name || "";
      const picture = decoded.picture || null;

      if (!email) {
        return res.status(400).json({
          success: false,
          message: "Email is required on the identity token",
        });
      }

      // Find or create user
      let user = await User.findOne({ email });
      if (!user) {
        // Derive a username from email
        const baseUsername = email.split("@")[0].replace(/[^a-zA-Z0-9_-]/g, "");
        let username = baseUsername || `user_${uid.substring(0, 6)}`;
        // Ensure uniqueness
        let suffix = 1;
        // eslint-disable-next-line no-await-in-loop
        while (await User.findOne({ username })) {
          username = `${baseUsername}_${suffix++}`;
        }

        const [firstName, ...rest] = name.split(" ");
        const lastName = rest.join(" ") || "User";

        user = new User({
          username,
          email,
          password: `firebase:${uid}`, // never used for login; placeholder
          firstName: firstName || "New",
          lastName,
          role:
            role && ["Organiser", "Team Member"].includes(role)
              ? role
              : "Team Member",
          plan:
            plan && ["free", "pro"].includes(plan.toLowerCase())
              ? plan.toLowerCase()
              : "free",
          isPro: plan?.toLowerCase() === "pro",
          emailVerified: Boolean(emailVerified),
          avatar: picture || null,
        });

        try {
          if (!picture) {
            await user.generateAvatar();
          }
        } catch (e) {
          logger.logger.warn("Avatar generation failed for Firebase user");
        }
        await user.save();
        logger.logger.info(
          `Firebase auth created user: ${user.username} (${email})`,
        );
      } else {
        // Update verification and avatar if provided
        const updates = {};
        if (emailVerified && !user.emailVerified) updates.emailVerified = true;
        if (picture && !user.avatar) updates.avatar = picture;
        if (
          plan &&
          ["free", "pro"].includes(plan.toLowerCase()) &&
          plan.toLowerCase() !== user.plan
        ) {
          updates.plan = plan.toLowerCase();
          updates.isPro = plan.toLowerCase() === "pro";
        }
        if (Object.keys(updates).length) {
          await User.updateOne({ _id: user._id }, { $set: updates });
        }
      }

      // Session
      req.session.userId = user._id;
      req.session.role = user.role;

      const userResponse = await User.findById(user._id)
        .select("-password")
        .lean();

      return res.status(200).json({
        success: true,
        message: "Login successful",
        data: {
          user: userResponse,
          redirectUrl:
            user.role === "Organiser"
              ? "/organiser-dashboard"
              : "/member-dashboard",
        },
      });
    } catch (error) {
      logger.logger.error("Firebase auth error:", error);
      throw new AppError("Failed to authenticate via Firebase", 500);
    }
  }),
);

// @route   POST /auth/web-login
// @desc    Web-based login for VS Code browser compatibility
// @access  Public
router.post(
  "/web-login",
  validateLogin,
  catchAsync(async (req, res) => {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.render("auth/login", {
          error: "Please provide valid login credentials",
          title: "Login - CollabSpace",
        });
      }

      const { email, password, rememberMe } = req.body;

      // Find user by email and include password for comparison
      const user = await User.findOne({ email }).select("+password");

      if (!user) {
        return res.render("auth/login", {
          error: "Invalid email or password",
          title: "Login - CollabSpace",
        });
      }

      // Check if account is locked
      if (user.isLocked()) {
        return res.render("auth/login", {
          error:
            "Account is temporarily locked due to multiple failed login attempts. Please try again later.",
          title: "Login - CollabSpace",
        });
      }

      // Check if account is active
      if (!user.isActive) {
        return res.render("auth/login", {
          error: "Account is deactivated",
          title: "Login - CollabSpace",
        });
      }

      // Verify password
      const isPasswordValid = await user.comparePassword(password);

      if (!isPasswordValid) {
        // Increment login attempts
        await user.incLoginAttempts();

        return res.render("auth/login", {
          error: "Invalid email or password",
          title: "Login - CollabSpace",
        });
      }

      // Reset login attempts on successful login
      if (user.loginAttempts > 0) {
        await user.resetLoginAttempts();
      }

      // Update last seen
      await user.updateLastSeen();

      // Create session
      req.session.userId = user._id;
      req.session.role = user.role;

      // Set cookie options based on "Remember Me" choice
      if (rememberMe) {
        // Extend session for 30 days if "Remember Me" is checked
        req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
        req.session.persistent = true;
        logger.logger.info(
          `Extended web session for user: ${user.email} (Remember Me: enabled)`,
        );
      } else {
        // Standard session for 24 hours
        req.session.cookie.maxAge = 24 * 60 * 60 * 1000; // 24 hours
        req.session.persistent = false;
        logger.logger.info(
          `Standard web session for user: ${user.email} (Remember Me: disabled)`,
        );
      }

      // Force session save to ensure persistence
      await new Promise((resolve, reject) => {
        req.session.save((err) => {
          if (err) {
            console.error("Session save error:", err);
            reject(err);
          } else {
            console.log(
              "✅ Web login session saved successfully for user:",
              user.email,
            );
            resolve();
          }
        });
      });

      logger.logger.info(
        `User logged in via web form: ${user.username} (${email})`,
      );

      // Redirect based on role
      if (user.role === "Organiser") {
        res.redirect("/organiser-dashboard");
      } else if (user.role === "Team Member") {
        res.redirect("/member-dashboard");
      } else {
        res.redirect("/dashboard");
      }
    } catch (error) {
      logger.logger.error("Web login error:", error);
      res.render("auth/login", {
        error: "Login failed. Please try again.",
        title: "Login - CollabSpace",
      });
    }
  }),
);

// @route   POST /api/auth/logout
// @desc    Logout user and destroy session
// @access  Private
router.post(
  "/logout",
  catchAsync(async (req, res) => {
    try {
      const userId = req.session?.userId;
      const userEmail = req.user?.email;

      if (req.session) {
        req.session.destroy((err) => {
          if (err) {
            logger.logger.error("Session destruction error:", err);
            return res.status(500).json({
              success: false,
              message: "Could not log out, please try again",
            });
          }

          // Clear all authentication cookies
          res.clearCookie("collabspace.sid"); // Clear our custom session cookie
          res.clearCookie("connect.sid"); // Clear default session cookie (fallback)

          // Clear any other authentication-related cookies
          res.clearCookie("user");
          res.clearCookie("token");

          logger.logger.info(
            `User logged out successfully: ${userEmail || userId || "Unknown"}`,
          );

          res.json({
            success: true,
            message: "Logout successful",
          });
        });
      } else {
        res.json({
          success: true,
          message: "Already logged out",
        });
      }
    } catch (error) {
      logger.logger.error("User logout error:", error);
      throw new AppError("Failed to logout user", 500);
    }
  }),
);

// @route   POST /api/auth/refresh
// @desc    Refresh JWT token (deprecated - using sessions now)
// @access  Public
// router.post(
//   "/refresh",
//   catchAsync(async (req, res) => {
//     // Session-based auth doesn't need token refresh
//     res.status(404).json({
//       success: false,
//       message: "Token refresh not needed with session-based authentication",
//     });
//   })
// );

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
        `Password reset token generated for ${email}: ${resetToken}`,
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
  }),
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
        "Password must contain at least one lowercase letter, one uppercase letter, and one number",
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
        `Password reset successful for user: ${user.username}`,
      );

      res.json({
        success: true,
        message: "Password has been reset successfully",
      });
    } catch (error) {
      logger.logger.error("Reset password error:", error);
      throw new AppError("Failed to reset password", 500);
    }
  }),
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
  }),
);

// @route   GET /api/auth/me
// @desc    Get current user profile
// @access  Private
router.get("/me", authenticateSession, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password");

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    logger.logger.error("Get user profile error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get user profile",
    });
  }
});

// @route   POST /api/auth/extend-session
// @desc    Extend session for persistent authentication
// @access  Private
router.post("/extend-session", authenticateSession, async (req, res) => {
  try {
    // Only extend if this is a persistent session
    if (req.session.persistent) {
      // Extend session by 30 days
      req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000;

      await new Promise((resolve, reject) => {
        req.session.save((err) => {
          if (err) {
            logger.logger.error("Session extension error:", err);
            reject(err);
          } else {
            logger.logger.info(`Session extended for user: ${req.user.email}`);
            resolve();
          }
        });
      });

      res.json({
        success: true,
        message: "Session extended successfully",
        expiresAt: new Date(
          Date.now() + req.session.cookie.maxAge,
        ).toISOString(),
      });
    } else {
      res.json({
        success: true,
        message: "Session not persistent, no extension needed",
      });
    }
  } catch (error) {
    logger.logger.error("Session extension error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to extend session",
    });
  }
});

module.exports = router;
