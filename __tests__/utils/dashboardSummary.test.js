jest.mock("../../src/models/Team", () => ({
  find: jest.fn(),
}));

jest.mock("../../src/models/Task", () => ({
  aggregate: jest.fn(),
}));

const Team = require("../../src/models/Team");
const Task = require("../../src/models/Task");
const { computeOrganiserSummary } = require("../../src/utils/dashboardSummary");

describe("computeOrganiserSummary", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("throws when organiserId is missing", async () => {
    await expect(computeOrganiserSummary()).rejects.toThrow(
      "organiserId required for summary"
    );
  });

  it("handles organisers without active teams", async () => {
    Team.find.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([]),
    });
    Task.aggregate.mockResolvedValue([]);

    const summary = await computeOrganiserSummary("123");

    expect(summary).toMatchObject({
      totalTeams: 0,
      totalMembers: 0,
      totalTasks: 0,
      completedTasks: 0,
      activeTasks: 0,
      completionRate: 0,
    });
  });

  it("aggregates task metrics for active teams", async () => {
    const mockTeams = [
      {
        _id: "team-1",
        members: ["u1", "u2"],
      },
      {
        _id: "team-2",
        members: ["u3"],
      },
    ];

    const mockSelect = jest.fn().mockReturnThis();
    const mockLean = jest.fn().mockResolvedValue(mockTeams);

    Team.find.mockReturnValue({
      select: mockSelect,
      lean: mockLean,
    });

    Task.aggregate.mockResolvedValue([
      {
        totalTasks: 5,
        completedTasks: 2,
      },
    ]);

    const summary = await computeOrganiserSummary("organiser-1");

    expect(Team.find).toHaveBeenCalledWith({
      admin: "organiser-1",
      isActive: true,
    });
    expect(mockSelect).toHaveBeenCalledWith(
      "_id members stats.totalTasks stats.completedTasks"
    );
    expect(mockLean).toHaveBeenCalled();

    expect(Task.aggregate).toHaveBeenCalledWith([
      { $match: { team: { $in: mockTeams.map((team) => team._id) }, isArchived: false } },
      {
        $group: {
          _id: null,
          totalTasks: { $sum: 1 },
          completedTasks: {
            $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] },
          },
        },
      },
    ]);

    expect(summary).toMatchObject({
      totalTeams: 2,
      totalMembers: 3,
      totalTasks: 5,
      completedTasks: 2,
      activeTasks: 3,
      completionRate: 40,
    });
    expect(summary.timestamp).toBeDefined();
  });
});


