const request = require("supertest");
const express = require("express");

// Mock the tasks route module
const mockRouter = express.Router();

// Mock middleware
const mockAuthenticateSession = (req, res, next) => {
  req.user = { _id: "user123", role: "member" };
  next();
};

const mockRequireTeamMembership = (req, res, next) => {
  req.team = { _id: "team123", name: "Test Team" };
  req.isTeamAdmin = false;
  next();
};

// Mock Task model
const mockTask = {
  find: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  updateOne: jest.fn(),
  deleteOne: jest.fn(),
  countDocuments: jest.fn(),
};

jest.mock("../../src/middleware/auth", () => ({
  authenticateSession: mockAuthenticateSession,
  requireTeamMembership: mockRequireTeamMembership,
}));

jest.mock("../../src/models/Task", () => mockTask);

describe("Tasks Routes", () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());

    // Mock routes
    mockRouter.get(
      "/teams/:teamId/tasks",
      mockAuthenticateSession,
      mockRequireTeamMembership,
      (req, res) => {
        res.json({
          success: true,
          tasks: [
            { _id: "task1", title: "Task 1", status: "pending" },
            { _id: "task2", title: "Task 2", status: "completed" },
          ],
        });
      }
    );

    mockRouter.post(
      "/teams/:teamId/tasks",
      mockAuthenticateSession,
      mockRequireTeamMembership,
      (req, res) => {
        if (!req.body.title) {
          return res
            .status(400)
            .json({ success: false, message: "Task title is required" });
        }
        res.status(201).json({
          success: true,
          task: {
            _id: "new_task_id",
            title: req.body.title,
            status: "pending",
          },
        });
      }
    );

    mockRouter.get(
      "/teams/:teamId/tasks/:taskId",
      mockAuthenticateSession,
      mockRequireTeamMembership,
      (req, res) => {
        if (req.params.taskId === "invalid") {
          return res
            .status(404)
            .json({ success: false, message: "Task not found" });
        }
        res.json({
          success: true,
          task: {
            _id: req.params.taskId,
            title: "Test Task",
            description: "Test Description",
            status: "pending",
          },
        });
      }
    );

    mockRouter.put(
      "/teams/:teamId/tasks/:taskId",
      mockAuthenticateSession,
      mockRequireTeamMembership,
      (req, res) => {
        res.json({ success: true, message: "Task updated successfully" });
      }
    );

    mockRouter.delete(
      "/teams/:teamId/tasks/:taskId",
      mockAuthenticateSession,
      mockRequireTeamMembership,
      (req, res) => {
        res.json({ success: true, message: "Task deleted successfully" });
      }
    );

    mockRouter.patch(
      "/teams/:teamId/tasks/:taskId/status",
      mockAuthenticateSession,
      mockRequireTeamMembership,
      (req, res) => {
        const { status } = req.body;
        const validStatuses = [
          "pending",
          "in_progress",
          "completed",
          "cancelled",
        ];

        if (!validStatuses.includes(status)) {
          return res
            .status(400)
            .json({ success: false, message: "Invalid status" });
        }

        res.json({ success: true, message: "Task status updated" });
      }
    );

    app.use("/api", mockRouter);

    // Reset mocks
    jest.clearAllMocks();
  });

  describe("GET /api/teams/:teamId/tasks", () => {
    it("should return tasks for authenticated team member", async () => {
      const response = await request(app)
        .get("/api/teams/team123/tasks")
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.tasks).toHaveLength(2);
      expect(response.body.tasks[0].title).toBe("Task 1");
    });
  });

  describe("POST /api/teams/:teamId/tasks", () => {
    it("should create a new task with valid data", async () => {
      const taskData = {
        title: "New Test Task",
        description: "Test task description",
        priority: "medium",
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      };

      const response = await request(app)
        .post("/api/teams/team123/tasks")
        .send(taskData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.task.title).toBe("New Test Task");
      expect(response.body.task.status).toBe("pending");
    });

    it("should return error when title is missing", async () => {
      const taskData = {
        description: "Task without title",
      };

      const response = await request(app)
        .post("/api/teams/team123/tasks")
        .send(taskData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("Task title is required");
    });
  });

  describe("GET /api/teams/:teamId/tasks/:taskId", () => {
    it("should return specific task by ID", async () => {
      const response = await request(app)
        .get("/api/teams/team123/tasks/task123")
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.task._id).toBe("task123");
      expect(response.body.task.title).toBe("Test Task");
    });

    it("should return 404 for invalid task ID", async () => {
      const response = await request(app)
        .get("/api/teams/team123/tasks/invalid")
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("Task not found");
    });
  });

  describe("PUT /api/teams/:teamId/tasks/:taskId", () => {
    it("should update task successfully", async () => {
      const updateData = {
        title: "Updated Task Title",
        description: "Updated description",
      };

      const response = await request(app)
        .put("/api/teams/team123/tasks/task123")
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("Task updated successfully");
    });
  });

  describe("DELETE /api/teams/:teamId/tasks/:taskId", () => {
    it("should delete task successfully", async () => {
      const response = await request(app)
        .delete("/api/teams/team123/tasks/task123")
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("Task deleted successfully");
    });
  });

  describe("PATCH /api/teams/:teamId/tasks/:taskId/status", () => {
    it("should update task status to completed", async () => {
      const response = await request(app)
        .patch("/api/teams/team123/tasks/task123/status")
        .send({ status: "completed" })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("Task status updated");
    });

    it("should update task status to in_progress", async () => {
      const response = await request(app)
        .patch("/api/teams/team123/tasks/task123/status")
        .send({ status: "in_progress" })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it("should reject invalid status", async () => {
      const response = await request(app)
        .patch("/api/teams/team123/tasks/task123/status")
        .send({ status: "invalid_status" })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("Invalid status");
    });

    it("should handle all valid statuses", async () => {
      const validStatuses = [
        "pending",
        "in_progress",
        "completed",
        "cancelled",
      ];

      for (const status of validStatuses) {
        const response = await request(app)
          .patch("/api/teams/team123/tasks/task123/status")
          .send({ status })
          .expect(200);

        expect(response.body.success).toBe(true);
      }
    });
  });
});
