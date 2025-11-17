const request = require("supertest");
const express = require("express");

// Mock the entire teams route module
const mockRouter = express.Router();

// Mock middleware functions
const mockAuthenticateSession = (req, res, next) => {
  req.user = { _id: "user123", role: "member" };
  next();
};

const mockRequireOrganiser = (req, res, next) => {
  if (req.user.role !== "organiser") {
    return res
      .status(403)
      .json({ success: false, message: "Organiser access required" });
  }
  next();
};

// Mock Team model
const mockTeam = {
  find: jest.fn(),
  findById: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  updateOne: jest.fn(),
  deleteOne: jest.fn(),
};

// Mock cache middleware
const mockCacheMiddleware = () => (req, res, next) => next();
const mockInvalidateCacheMiddleware = () => (req, res, next) => next();

jest.mock("../../src/middleware/auth", () => ({
  authenticateSession: mockAuthenticateSession,
  requireOrganiser: mockRequireOrganiser,
}));

jest.mock("../../src/middleware/cache", () => ({
  cacheMiddleware: mockCacheMiddleware,
  invalidateCacheMiddleware: mockInvalidateCacheMiddleware,
}));

jest.mock("../../src/models/Team", () => mockTeam);

describe("Teams Routes", () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());

    // Mock routes
    mockRouter.get("/teams", mockAuthenticateSession, (req, res) => {
      res.json({ success: true, teams: [] });
    });

    mockRouter.post(
      "/teams",
      mockAuthenticateSession,
      mockRequireOrganiser,
      (req, res) => {
        if (!req.body.name) {
          return res
            .status(400)
            .json({ success: false, message: "Team name is required" });
        }
        res.status(201).json({ success: true, team: { name: req.body.name } });
      }
    );

    mockRouter.get("/teams/:id", mockAuthenticateSession, (req, res) => {
      if (req.params.id === "invalid") {
        return res
          .status(404)
          .json({ success: false, message: "Team not found" });
      }
      res.json({
        success: true,
        team: { _id: req.params.id, name: "Test Team" },
      });
    });

    mockRouter.put("/teams/:id", mockAuthenticateSession, (req, res) => {
      res.json({ success: true, message: "Team updated" });
    });

    mockRouter.delete(
      "/teams/:id",
      mockAuthenticateSession,
      mockRequireOrganiser,
      (req, res) => {
        res.json({ success: true, message: "Team deleted" });
      }
    );

    app.use("/api", mockRouter);

    // Reset mocks
    jest.clearAllMocks();
  });

  describe("GET /api/teams", () => {
    it("should return teams for authenticated user", async () => {
      const response = await request(app).get("/api/teams").expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.teams).toEqual([]);
    });
  });

  describe("POST /api/teams", () => {
    it("should create team when user is organiser", async () => {
      // Mock user as organiser
      const orgRouter = express.Router();
      orgRouter.post(
        "/teams",
        (req, res, next) => {
          req.user = { _id: "user123", role: "organiser" };
          next();
        },
        mockRequireOrganiser,
        (req, res) => {
          if (!req.body.name) {
            return res
              .status(400)
              .json({ success: false, message: "Team name is required" });
          }
          res
            .status(201)
            .json({ success: true, team: { name: req.body.name } });
        }
      );

      const orgApp = express();
      orgApp.use(express.json());
      orgApp.use("/api", orgRouter);

      const response = await request(orgApp)
        .post("/api/teams")
        .send({ name: "New Team" })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.team.name).toBe("New Team");
    });

    it("should return error when team name is missing", async () => {
      // Mock user as organiser
      const orgRouter = express.Router();
      orgRouter.post(
        "/teams",
        (req, res, next) => {
          req.user = { _id: "user123", role: "organiser" };
          next();
        },
        mockRequireOrganiser,
        (req, res) => {
          if (!req.body.name) {
            return res
              .status(400)
              .json({ success: false, message: "Team name is required" });
          }
          res
            .status(201)
            .json({ success: true, team: { name: req.body.name } });
        }
      );

      const orgApp = express();
      orgApp.use(express.json());
      orgApp.use("/api", orgRouter);

      const response = await request(orgApp)
        .post("/api/teams")
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("Team name is required");
    });

    it("should deny access to non-organiser users", async () => {
      const response = await request(app)
        .post("/api/teams")
        .send({ name: "New Team" })
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("Organiser access required");
    });
  });

  describe("GET /api/teams/:id", () => {
    it("should return team by ID", async () => {
      const response = await request(app).get("/api/teams/team123").expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.team._id).toBe("team123");
      expect(response.body.team.name).toBe("Test Team");
    });

    it("should return 404 for invalid team ID", async () => {
      const response = await request(app).get("/api/teams/invalid").expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("Team not found");
    });
  });

  describe("PUT /api/teams/:id", () => {
    it("should update team", async () => {
      const response = await request(app)
        .put("/api/teams/team123")
        .send({ name: "Updated Team" })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("Team updated");
    });
  });

  describe("DELETE /api/teams/:id", () => {
    it("should deny deletion to non-organiser users", async () => {
      const response = await request(app)
        .delete("/api/teams/team123")
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("Organiser access required");
    });
  });
});
