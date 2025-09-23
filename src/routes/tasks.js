const express = require("express");
const { body, validationResult } = require("express-validator");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const Task = require("../models/Task");
const Team = require("../models/Team");
const Message = require("../models/Message");
const { catchAsync, AppError } = require("../middleware/errorHandler");
const { requireTeamMembership, requireTeamOrganiser, requireAuth } = require("../middleware/auth");
const { logger } = require("../middleware/logger");

const router = express.Router();

// Helper function to check if user has access to a task
const checkTaskAccess = (task, userId) => {
  // If task has no team (orphaned), allow access for cleanup
  if (!task.team) {
    return { hasAccess: true, isOrphaned: true };
  }
  
  const hasAccess = task.team.members.includes(userId);
  return { hasAccess, isOrphaned: false };
};

// Helper function to handle orphaned task response
const handleOrphanedTask = (task, action = "view") => {
  if (action === "delete") {
    return {
      success: true,
      message: "Orphaned task deleted successfully (team was deleted)",
      data: { task: { ...task.toObject(), isOrphaned: true } }
    };
  }
  
  return {
    success: true,
    data: { 
      task: {
        ...task.toObject(),
        isOrphaned: true,
        team: { name: "Deleted Team", members: [] }
      }
    }
  };
};

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
    cb(null, "task-" + uniqueSuffix + path.extname(file.originalname));
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
const validateTaskCreation = [
  body("title")
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage("Task title must be between 3 and 200 characters"),
  body("description")
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage("Task description cannot exceed 2000 characters"),
  body("team").isMongoId().withMessage("Valid team ID is required"),
  body("assignedTo")
    .optional()
    .isMongoId()
    .withMessage("Valid user ID is required for assignment"),
  body("priority")
    .optional()
    .isIn(["low", "medium", "high", "urgent"])
    .withMessage("Priority must be one of: low, medium, high, urgent"),
  body("dueDate")
    .optional()
    .isISO8601()
    .withMessage("Due date must be a valid date")
    .custom((value) => {
      if (value) {
        const dueDate = new Date(value);
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Reset time to start of day
        dueDate.setHours(0, 0, 0, 0);
        
        if (dueDate < today) {
          throw new Error("Due date cannot be in the past");
        }
      }
      return true;
    }),
  body("estimatedHours")
    .optional()
    .isFloat({ min: 0, max: 1000 })
    .withMessage("Estimated hours must be between 0 and 1000"),
  body("tags").optional().isArray().withMessage("Tags must be an array"),
  body("tags.*")
    .optional()
    .trim()
    .isLength({ min: 1, max: 20 })
    .withMessage("Each tag must be between 1 and 20 characters"),
];

const validateTaskUpdate = [
  body("title")
    .optional()
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage("Task title must be between 3 and 200 characters"),
  body("description")
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage("Task description cannot exceed 2000 characters"),
  body("assignedTo")
    .optional()
    .isMongoId()
    .withMessage("Valid user ID is required for assignment"),
  body("status")
    .optional()
    .isIn(["todo", "in_progress", "review", "completed", "cancelled"])
    .withMessage(
      "Status must be one of: todo, in_progress, review, completed, cancelled"
    ),
  body("priority")
    .optional()
    .isIn(["low", "medium", "high", "urgent"])
    .withMessage("Priority must be one of: low, medium, high, urgent"),
  body("dueDate")
    .optional()
    .isISO8601()
    .withMessage("Due date must be a valid date")
    .custom((value) => {
      if (value) {
        const dueDate = new Date(value);
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Reset time to start of day
        dueDate.setHours(0, 0, 0, 0);
        
        if (dueDate < today) {
          throw new Error("Due date cannot be in the past");
        }
      }
      return true;
    }),
  body("estimatedHours")
    .optional()
    .isFloat({ min: 0, max: 1000 })
    .withMessage("Estimated hours must be between 0 and 1000"),
  body("progress")
    .optional()
    .isInt({ min: 0, max: 100 })
    .withMessage("Progress must be between 0 and 100"),
  body("tags").optional().isArray().withMessage("Tags must be an array"),
  body("tags.*")
    .optional()
    .trim()
    .isLength({ min: 1, max: 20 })
    .withMessage("Each tag must be between 1 and 20 characters"),
];

const validateComment = [
  body("content")
    .trim()
    .isLength({ min: 1, max: 1000 })
    .withMessage("Comment content must be between 1 and 1000 characters"),
];

const validateTimeLog = [
  body("hours")
    .isFloat({ min: 0.1, max: 24 })
    .withMessage("Hours must be between 0.1 and 24"),
  body("description")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Description cannot exceed 500 characters"),
];

// @route   GET /api/tasks
// @desc    Get tasks for user
// @access  Private
router.get(
  "/",
  requireAuth,
  catchAsync(async (req, res) => {
    try {
      const {
        page = 1,
        limit = 20,
        team,
        status,
        priority,
        assignedTo,
        search,
        sortBy = "createdAt",
        sortOrder = "desc",
        organiser = false,
      } = req.query;

      const options = { status, team, assignedTo };

      // Remove undefined options
      Object.keys(options).forEach(
        (key) => options[key] === undefined && delete options[key]
      );

      const skip = (page - 1) * limit;
      const sort = { [sortBy]: sortOrder === "desc" ? -1 : 1 };

      let tasks;
      let total;

      if (organiser === 'true') {
        // Get tasks for teams where user is admin/organiser
        const userTeams = await Team.find({ admin: req.user._id }).select('_id');
        const teamIds = userTeams.map(team => team._id);

        console.log('Organiser task query debug:', {
          userId: req.user._id,
          userTeams: userTeams.length,
          teamIds: teamIds.length
        });

        const query = {
          $or: [
            { createdBy: req.user._id },      // Tasks created by the organiser
            { team: { $in: teamIds } }        // Tasks in teams they admin
          ],
          isArchived: false,
        };

        if (status) query.status = status;
        if (team) query.team = team;
        if (assignedTo) query.assignedTo = assignedTo;

        console.log('Task query:', query);

        tasks = await Task.find(query)
          .populate("team", "name")
          .populate("assignedTo", "username firstName lastName avatar")
          .populate("createdBy", "username firstName lastName")
          .sort(sort)
          .skip(skip)
          .limit(parseInt(limit));

        console.log('Tasks found:', tasks.length);
        tasks.forEach(task => {
          console.log(`- Task: ${task.title}, Team: ${task.team?.name}, Status: ${task.status}`);
        });

        total = await Task.countDocuments(query);
      } else {
        // Get tasks for user
        tasks = await Task.findByUser(req.user._id, options)
          .sort(sort)
          .skip(skip)
          .limit(parseInt(limit));

        // Get total count
        const query = {
          $or: [{ assignedTo: req.user._id }, { createdBy: req.user._id }],
          isArchived: false,
        };

        if (status) query.status = status;
        if (team) query.team = team;
        if (assignedTo) query.assignedTo = assignedTo;

        total = await Task.countDocuments(query);
      }

      res.json({
        success: true,
        data: {
          tasks,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / limit),
          },
        },
      });
    } catch (error) {
      logger.error("Get tasks error:", error);
      throw new AppError("Failed to get tasks", 500);
    }
  })
);

// @route   GET /api/tasks/team/:teamId
// @desc    Get tasks for a specific team
// @access  Private (Team Member)
router.get(
  "/team/:teamId",
  requireTeamMembership,
  catchAsync(async (req, res) => {
    try {
      const {
        page = 1,
        limit = 20,
        status,
        priority,
        assignedTo,
        search,
        sortBy = "createdAt",
        sortOrder = "desc",
      } = req.query;

      const options = { status, priority, assignedTo };

      // Remove undefined options
      Object.keys(options).forEach(
        (key) => options[key] === undefined && delete options[key]
      );

      const skip = (page - 1) * limit;
      const sort = { [sortBy]: sortOrder === "desc" ? -1 : 1 };

      const tasks = await Task.findByTeam(req.params.teamId, options)
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit));

      const total = await Task.countDocuments({
        team: req.params.teamId,
        isArchived: false,
        ...options,
      });

      res.json({
        success: true,
        data: {
          tasks,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / limit),
          },
        },
      });
    } catch (error) {
      logger.error("Get team tasks error:", error);
      throw new AppError("Failed to get team tasks", 500);
    }
  })
);

// @route   GET /api/tasks/overdue
// @desc    Get overdue tasks
// @access  Private
router.get(
  "/overdue",
  catchAsync(async (req, res) => {
    try {
      const { team } = req.query;
      const teamId = team || null;

      const overdueTasks = await Task.findOverdue(teamId);

      res.json({
        success: true,
        data: { tasks: overdueTasks },
      });
    } catch (error) {
      logger.error("Get overdue tasks error:", error);
      throw new AppError("Failed to get overdue tasks", 500);
    }
  })
);

// @route   POST /api/tasks
// @desc    Create a new task
// @access  Private
router.post(
  "/",
  requireAuth,
  validateTaskCreation,
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
        title,
        description,
        team,
        assignedTo,
        priority,
        dueDate,
        estimatedHours,
        tags,
      } = req.body;

      // Verify user is member of the team
      const teamDoc = await Team.findById(team);
      if (!teamDoc || !teamDoc.members.includes(req.user._id)) {
        return res.status(403).json({
          success: false,
          message: "You are not a member of this team",
        });
      }

      // Verify assigned user is member of the team (if assigned)
      if (assignedTo) {
        if (!teamDoc.members.includes(assignedTo)) {
          return res.status(400).json({
            success: false,
            message: "Assigned user must be a member of the team",
          });
        }
      }

      // Create new task
      const task = new Task({
        title,
        description,
        team,
        assignedTo,
        createdBy: req.user._id,
        priority,
        dueDate,
        estimatedHours,
        tags,
      });

      await task.save();

      // Update team stats
      await teamDoc.updateTaskStats();

      // Populate task data for response
      await task.populate("team", "name");
      await task.populate("assignedTo", "username firstName lastName avatar");
      await task.populate("createdBy", "username firstName lastName avatar");

      // Create system message for task creation
      try {
        await Message.createTaskUpdateMessage(
          team,
          req.user._id,
          task._id,
          "created",
          title
        );
      } catch (error) {
        logger.warn("Failed to create task update message:", error.message);
      }

      logger.info(
        `User ${req.user.username} created task: ${title} in team: ${teamDoc.name}`
      );

      // Send successful response first
      res.status(201).json({
        success: true,
        message: "Task created successfully",
        data: { task },
      });

      // Emit organiser summary (team admin) - temporarily disabled for debugging
      // try {
      //   const { emitOrganiserSummary } = require('../app');
      //   if (emitOrganiserSummary) {
      //     emitOrganiserSummary(teamDoc.admin.toString());
      //   }
      // } catch (e) {
      //   logger.warn('Failed to emit organiser summary after task create:', e.message);
      // }

    } catch (error) {
      logger.error("Create task error:", error);
      throw new AppError("Failed to create task", 500);
    }
  })
);

// @route   GET /api/tasks/:id
// @desc    Get task details
// @access  Private
router.get(
  "/:id",
  requireAuth,
  catchAsync(async (req, res) => {
    try {
      const task = await Task.findById(req.params.id)
        .populate("team", "name members")
        .populate("assignedTo", "username firstName lastName avatar")
        .populate("createdBy", "username firstName lastName avatar")
        .populate("comments.author", "username firstName lastName avatar")
        .populate("timeLogs.user", "username firstName lastName avatar");

      if (!task) {
        return res.status(404).json({
          success: false,
          message: "Task not found",
        });
      }

      // Check if task has a valid team
      if (!task.team) {
        // Orphaned task - return task details but mark as orphaned
        return res.json({
          success: true,
          data: { 
            task: {
              ...task.toObject(),
              isOrphaned: true,
              team: { name: "Deleted Team", members: [] }
            }
          },
        });
      }

      // Check if user has access to this task
      if (!task.team.members.includes(req.user._id)) {
        return res.status(403).json({
          success: false,
          message: "You do not have access to this task",
        });
      }

      res.json({
        success: true,
        data: { task },
      });
    } catch (error) {
      logger.error("Get task details error:", error);
      throw new AppError("Failed to get task details", 500);
    }
  })
);

// @route   PUT /api/tasks/:id
// @desc    Update task
// @access  Private
router.put(
  "/:id",
  requireAuth,
  validateTaskUpdate,
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

      const task = await Task.findById(req.params.id).populate(
        "team",
        "name members admin"
      ).populate("createdBy", "_id");

      console.log('Task found for update:', {
        id: task?._id,
        title: task?.title,
        teamMembers: task?.team?.members?.length,
        teamAdmin: task?.team?.admin,
        createdBy: task?.createdBy
      });

      if (!task) {
        return res.status(404).json({
          success: false,
          message: "Task not found",
        });
      }

      // Check if user has access to this task
      const userId = req.user._id.toString();
      const teamMemberIds = task.team.members.map(member => member.toString());
      const teamAdminId = task.team.admin ? task.team.admin.toString() : null;
      
      const hasAccess = teamMemberIds.includes(userId) || 
                       (teamAdminId && teamAdminId === userId) ||
                       (task.createdBy && task.createdBy.toString() === userId);
      
      if (!hasAccess) {
        console.log('Access denied for task update. User:', userId);
        console.log('Team members:', teamMemberIds);
        console.log('Team admin:', teamAdminId);
        console.log('Task creator:', task.createdBy ? task.createdBy.toString() : 'none');
        return res.status(403).json({
          success: false,
          message: "You do not have access to this task",
        });
      }

      const updateData = req.body;

      // Remove undefined fields
      Object.keys(updateData).forEach(
        (key) => updateData[key] === undefined && delete updateData[key]
      );

      // Verify assigned user is member of the team (if being changed)
      if (
        updateData.assignedTo &&
        !teamMemberIds.includes(updateData.assignedTo.toString())
      ) {
        return res.status(400).json({
          success: false,
          message: "Assigned user must be a member of the team",
        });
      }

      // Update task
      console.log('Attempting to update task with data:', updateData);
      Object.assign(task, updateData);
      await task.save();
      console.log('Task updated successfully');

      // Re-populate the team if it was changed
      if (updateData.team) {
        await task.populate("team", "name members admin");
        console.log('Team re-populated after update');
      }

      // Update team stats
      try {
        if (task.team && typeof task.team.updateTaskStats === 'function') {
          await task.team.updateTaskStats();
          console.log('Team stats updated');
        } else {
          console.log('Team stats update skipped - method not available');
        }
      } catch (statsError) {
        console.error('Error updating team stats:', statsError);
        logger.warn('Failed to update team stats:', statsError.message);
      }

      // Populate updated task data
      await task.populate("team", "name");
      await task.populate("assignedTo", "username firstName lastName avatar");
      await task.populate("createdBy", "username firstName lastName avatar");

      // Create system message for task update
      try {
        await Message.createTaskUpdateMessage(
          task.team._id,
          req.user._id,
          task._id,
          "updated",
          task.title
        );
      } catch (error) {
        logger.warn("Failed to create task update message:", error.message);
      }

      logger.info(`User ${req.user.username} updated task: ${task.title}`);

      // Emit real-time updates
      try {
        const { emitOrganiserSummary, io } = require('../app');
        
        // Emit to organiser dashboard (team admin)
        if (task.team && task.team.admin) {
          emitOrganiserSummary && emitOrganiserSummary(task.team.admin.toString());
        }
        
        // Emit task update to team members
        if (io && task.team) {
          io.to(`team-${task.team._id}`).emit("task updated", {
            taskId: task._id,
            task: task,
            updatedBy: req.user._id,
            timestamp: new Date()
          });
          console.log('Emitted task updated event to team');
        }

        // Emit dashboard refresh to all connected organiser sockets
        if (io && task.team && task.team.admin) {
          io.emit('dashboard refresh', {
            type: 'task_updated',
            taskId: task._id,
            teamId: task.team._id,
            organiserId: task.team.admin
          });
          console.log('Emitted dashboard refresh event');
        }
        
      } catch (e) {
        console.error('Failed to emit real-time updates:', e);
        logger.warn('Failed to emit real-time updates after task update');
      }

      res.json({
        success: true,
        message: "Task updated successfully",
        data: { task },
      });
    } catch (error) {
      logger.error("Update task error:", error);
      throw new AppError("Failed to update task", 500);
    }
  })
);

// @route   DELETE /api/tasks/:id
// @desc    Delete task
// @access  Private
router.delete(
  "/:id",
  requireAuth,
  catchAsync(async (req, res) => {
    try {
      const task = await Task.findById(req.params.id).populate(
        "team",
        "name members admin"
      );

      if (!task) {
        return res.status(404).json({
          success: false,
          message: "Task not found",
        });
      }

      // Check if task has a valid team
      if (!task.team) {
        // Orphaned task - team was deleted, allow deletion for cleanup
        logger.info(`Deleting orphaned task: ${task.title} (team was deleted)`);
        
        await Task.findByIdAndDelete(req.params.id);
        
        logger.info(`Orphaned task deleted successfully`);
        
        return res.json({
          success: true,
          message: "Orphaned task deleted successfully",
        });
      }

      // Check if user has access to this task (either team member or team admin)
      const isTeamMember = task.team.members.some(member => 
        member.toString() === req.user._id.toString()
      );
      const isTeamAdmin = task.team.admin && task.team.admin.toString() === req.user._id.toString();

      if (!isTeamMember && !isTeamAdmin) {
        return res.status(403).json({
          success: false,
          message: "You do not have access to this task",
        });
      }

      // Only task creator or team admin can delete
      if (
        task.createdBy.toString() !== req.user._id.toString() &&
        !isTeamAdmin
      ) {
        return res.status(403).json({
          success: false,
          message: "Only task creator or team admin can delete this task",
        });
      }

      const taskTitle = task.title;
      const teamId = task.team._id || task.team;
      
      logger.info(`Attempting to delete task: ${taskTitle}, Team ID: ${teamId}`);
      
      const teamDoc = await Team.findById(teamId);
      
      logger.info(`Team document found: ${teamDoc ? 'Yes' : 'No'}`);
      
      await Task.findByIdAndDelete(req.params.id);
      
      logger.info(`Task deleted from database successfully`);

      // Update team stats
      if (teamDoc) {
        logger.info(`Updating team stats...`);
        await teamDoc.updateTaskStats();
        logger.info(`Team stats updated successfully`);
      }

      logger.info(`User ${req.user.username} deleted task: ${taskTitle}`);

      // Emit organiser summary (team admin)
      try {
        const { emitOrganiserSummary } = require('../app');
        if (task.team && task.team.admin) {
          emitOrganiserSummary && emitOrganiserSummary(task.team.admin.toString());
        }
      } catch (e) {
        logger.warn('Failed to emit organiser summary after task delete');
      }

      res.json({
        success: true,
        message: "Task deleted successfully",
      });
    } catch (error) {
      logger.error("Delete task error:", {
        error: error.message,
        stack: error.stack,
        taskId: req.params.id,
        userId: req.user._id
      });
      throw new AppError("Failed to delete task", 500);
    }
  })
);

// @route   POST /api/tasks/:id/assign
// @desc    Assign task to user
// @access  Private
router.post(
  "/:id/assign",
  [body("userId").isMongoId().withMessage("Valid user ID is required")],
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

      const { userId } = req.body;

      const task = await Task.findById(req.params.id).populate(
        "team",
        "name members"
      );

      if (!task) {
        return res.status(404).json({
          success: false,
          message: "Task not found",
        });
      }

      // Check if user has access to this task
      if (!task.team.members.includes(req.user._id)) {
        return res.status(403).json({
          success: false,
          message: "You do not have access to this task",
        });
      }

      // Verify assigned user is member of the team
      if (!task.team.members.includes(userId)) {
        return res.status(400).json({
          success: false,
          message: "Assigned user must be a member of the team",
        });
      }

      // Assign task
      await task.assignTo(userId);

      // Populate updated task data
      await task.populate("assignedTo", "username firstName lastName avatar");

      // Create system message for task assignment
      try {
        await Message.createTaskUpdateMessage(
          task.team._id,
          req.user._id,
          task._id,
          "assigned",
          task.title
        );
      } catch (error) {
        logger.warn("Failed to create task update message:", error.message);
      }

      logger.info(
        `User ${req.user.username} assigned task: ${task.title} to user: ${userId}`
      );

      res.json({
        success: true,
        message: "Task assigned successfully",
        data: { task },
      });
    } catch (error) {
      logger.error("Assign task error:", error);
      throw new AppError("Failed to assign task", 500);
    }
  })
);

// @route   POST /api/tasks/:id/status
// @desc    Update task status
// @access  Private
router.post(
  "/:id/status",
  requireAuth, // Add authentication middleware
  [
    body("status")
      .isIn(["todo", "in_progress", "review", "completed", "cancelled"])
      .withMessage(
        "Status must be one of: todo, in_progress, review, completed, cancelled"
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

      const { status } = req.body;
      logger.info(`Attempting to update task ${req.params.id} to status: ${status}`);

      const task = await Task.findById(req.params.id).populate("team", "name");

      if (!task) {
        logger.error(`Task not found: ${req.params.id}`);
        return res.status(404).json({
          success: false,
          message: "Task not found",
        });
      }

      logger.info(`Found task: ${task.title}, current status: ${task.status}`);

      // Check if user has access to this task
      const team = await Team.findById(task.team);
      if (!team) {
        logger.error(`Team not found for task: ${task.team}`);
        return res.status(404).json({
          success: false,
          message: "Team not found",
        });
      }

      logger.info(`Team found: ${team.name}, admin: ${team.admin}, members: ${team.members}, user: ${req.user._id}`);

      if (!team.members.includes(req.user._id) && !team.admin.equals(req.user._id)) {
        logger.error(`User ${req.user._id} does not have access to task ${req.params.id} in team ${team._id}`);
        return res.status(403).json({
          success: false,
          message: "You do not have access to this task",
        });
      }

      logger.info(`User has access, updating status...`);

      // Update status
      await task.updateStatus(status, req.user._id);

      logger.info(`Status updated successfully`);

      // Populate updated task data
      await task.populate("assignedTo", "username firstName lastName avatar");

      // Create system message for status change
      try {
        const action = status === "completed" ? "completed" : "updated";
        await Message.createTaskUpdateMessage(
          task.team._id,
          req.user._id,
          task._id,
          action,
          task.title
        );
      } catch (error) {
        logger.warn("Failed to create task update message:", error.message);
      }

      logger.info(
        `User ${req.user.username} updated task status: ${task.title} to ${status}`
      );

      res.json({
        success: true,
        message: "Task status updated successfully",
        data: { task },
      });
    } catch (error) {
      logger.error("Update task status error:", error);
      logger.error("Error details:", {
        message: error.message,
        stack: error.stack,
        taskId: req.params.id,
        status: req.body.status,
        userId: req.user._id
      });
      throw new AppError("Failed to update task status", 500);
    }
  })
);

// @route   POST /api/tasks/:id/comments
// @desc    Add comment to task
// @access  Private
router.post(
  "/:id/comments",
  validateComment,
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

      const task = await Task.findById(req.params.id).populate(
        "team",
        "name members"
      );

      if (!task) {
        return res.status(404).json({
          success: false,
          message: "Task not found",
        });
      }

      // Check if user has access to this task
      if (!task.team.members.includes(req.user._id)) {
        return res.status(403).json({
          success: false,
          message: "You do not have access to this task",
        });
      }

      // Add comment
      const comment = await task.addComment(content, req.user._id);

      // Populate comment author
      await comment.populate("author", "username firstName lastName avatar");

      logger.info(
        `User ${req.user.username} added comment to task: ${task.title}`
      );

      res.json({
        success: true,
        message: "Comment added successfully",
        data: { comment },
      });
    } catch (error) {
      logger.error("Add comment error:", error);
      throw new AppError("Failed to add comment", 500);
    }
  })
);

// @route   POST /api/tasks/:id/time-log
// @desc    Log time to task
// @access  Private
router.post(
  "/:id/time-log",
  validateTimeLog,
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

      const { hours, description } = req.body;

      const task = await Task.findById(req.params.id).populate(
        "team",
        "name members"
      );

      if (!task) {
        return res.status(404).json({
          success: false,
          message: "Task not found",
        });
      }

      // Check if user has access to this task
      if (!task.team.members.includes(req.user._id)) {
        return res.status(403).json({
          success: false,
          message: "You do not have access to this task",
        });
      }

      // Log time
      const timeLog = await task.logTime(req.user._id, hours, description);

      // Populate time log user
      await timeLog.populate("user", "username firstName lastName avatar");

      logger.info(
        `User ${req.user.username} logged ${hours} hours to task: ${task.title}`
      );

      res.json({
        success: true,
        message: "Time logged successfully",
        data: { timeLog },
      });
    } catch (error) {
      logger.error("Log time error:", error);
      throw new AppError("Failed to log time", 500);
    }
  })
);

// @route   POST /api/tasks/:id/archive
// @desc    Archive task
// @access  Private
router.post(
  "/:id/archive",
  catchAsync(async (req, res) => {
    try {
      const task = await Task.findById(req.params.id).populate(
        "team",
        "name members"
      );

      if (!task) {
        return res.status(404).json({
          success: false,
          message: "Task not found",
        });
      }

      // Check if user has access to this task
      if (!task.team.members.includes(req.user._id)) {
        return res.status(403).json({
          success: false,
          message: "You do not have access to this task",
        });
      }

      // Archive task
      task.isArchived = true;
      await task.save();

      logger.info(`User ${req.user.username} archived task: ${task.title}`);

      res.json({
        success: true,
        message: "Task archived successfully",
      });
    } catch (error) {
      logger.error("Archive task error:", error);
      throw new AppError("Failed to archive task", 500);
    }
  })
);

// @route   POST /api/tasks/:id/restore
// @desc    Restore archived task
// @access  Private
router.post(
  "/:id/restore",
  catchAsync(async (req, res) => {
    try {
      const task = await Task.findById(req.params.id).populate(
        "team",
        "name members"
      );

      if (!task) {
        return res.status(404).json({
          success: false,
          message: "Task not found",
        });
      }

      // Check if user has access to this task
      if (!task.team.members.includes(req.user._id)) {
        return res.status(403).json({
          success: false,
          message: "You do not have access to this task",
        });
      }

      // Restore task
      task.isArchived = false;
      await task.save();

      logger.info(`User ${req.user.username} restored task: ${task.title}`);

      res.json({
        success: true,
        message: "Task restored successfully",
      });
    } catch (error) {
      logger.error("Restore task error:", error);
      throw new AppError("Failed to restore task", 500);
    }
  })
);

module.exports = router;
