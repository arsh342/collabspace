jest.mock("../../src/models/User", () => ({
  findById: jest.fn(),
}));

jest.mock("../../src/models/Team", () => ({
  findById: jest.fn(),
}));

const User = require("../../src/models/User");
const Team = require("../../src/models/Team");

const {
  authenticateSession,
  requireOrganiser,
  requireTeamMembership,
} = require("../../src/middleware/auth");

const createRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.redirect = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  return res;
};

describe("authenticateSession", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 401 when no session userId present", async () => {
    const req = {
      session: {},
    };
    const res = createRes();
    const next = jest.fn();

    await authenticateSession(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Authentication required",
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("destroys session and returns 401 when user not found", async () => {
    const destroy = jest.fn();
    User.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue(null),
    });

    const req = {
      session: { userId: "missing-user", destroy },
    };
    const res = createRes();
    const next = jest.fn();

    await authenticateSession(req, res, next);

    expect(User.findById).toHaveBeenCalledWith("missing-user");
    expect(destroy).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Invalid session - user not found",
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("attaches user to request and calls next on success", async () => {
    const destroy = jest.fn();
    const mockUser = { _id: "user123", isActive: true, role: "Organiser" };
    User.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue(mockUser),
    });

    const req = {
      session: { userId: "user123", destroy },
    };
    const res = createRes();
    const next = jest.fn();

    await authenticateSession(req, res, next);

    expect(req.user).toEqual(mockUser);
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
    expect(destroy).not.toHaveBeenCalled();
  });
});

describe("requireOrganiser", () => {
  it("returns 403 when user role is not organiser", async () => {
    const req = {
      user: { role: "Team Member" },
    };
    const res = createRes();
    const next = jest.fn();

    await requireOrganiser(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Organiser access required",
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("calls next when user role is organiser", async () => {
    const req = {
      user: { role: "Organiser" },
    };
    const res = createRes();
    const next = jest.fn();

    await requireOrganiser(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });
});

describe("requireTeamMembership", () => {
  const baseUser = { _id: "user123", isActive: true };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockAuthenticatedUser = () => {
    User.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue(baseUser),
    });
  };

  it("returns 400 when team id is missing", async () => {
    mockAuthenticatedUser();

    const req = {
      session: { userId: "user123", destroy: jest.fn() },
      params: {},
    };
    const res = createRes();
    const next = jest.fn();

    await requireTeamMembership(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Team ID is required",
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 404 when team not found", async () => {
    mockAuthenticatedUser();
    Team.findById.mockResolvedValue(null);

    const req = {
      session: { userId: "user123", destroy: jest.fn() },
      params: { teamId: "missing-team" },
    };
    const res = createRes();
    const next = jest.fn();

    await requireTeamMembership(req, res, next);

    expect(Team.findById).toHaveBeenCalledWith("missing-team");
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Team not found",
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 403 when user is not member nor admin", async () => {
    mockAuthenticatedUser();

    Team.findById.mockResolvedValue({
      members: ["another-user"],
      admin: { toString: () => "admin456" },
    });

    const req = {
      session: { userId: "user123", destroy: jest.fn() },
      params: { id: "team-123" },
    };
    const res = createRes();
    const next = jest.fn();

    await requireTeamMembership(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "You are not a member of this team",
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("attaches team and flags admin when user is team admin", async () => {
    mockAuthenticatedUser();

    const mockTeam = {
      members: ["user123"],
      admin: { toString: () => "user123" },
    };
    Team.findById.mockResolvedValue(mockTeam);

    const req = {
      session: { userId: "user123", destroy: jest.fn() },
      params: { teamId: "team-123" },
    };
    const res = createRes();
    const next = jest.fn();

    await requireTeamMembership(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.team).toBe(mockTeam);
    expect(req.isTeamAdmin).toBe(true);
    expect(res.status).not.toHaveBeenCalled();
  });
});


