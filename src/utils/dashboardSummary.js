const Team = require("../models/Team");
const Task = require("../models/Task");

/**
 * Compute organiser level summary metrics.
 * Returns counts scoped to teams where user is admin.
 * Uses lean queries + aggregation for efficiency.
 * @param {import('mongoose').Types.ObjectId|string} organiserId
 */
async function computeOrganiserSummary(organiserId) {
  if (!organiserId) throw new Error("organiserId required for summary");

  // Find teams where user is admin (active only)
  const teams = await Team.find({ admin: organiserId, isActive: true })
    .select("_id members stats.totalTasks stats.completedTasks")
    .lean();

  const totalTeams = teams.length;
  const totalMembers = teams.reduce(
    (sum, t) => sum + (Array.isArray(t.members) ? t.members.length : 0),
    0
  );

  // Aggregate tasks for these teams (only non-archived)
  let totalTasks = 0;
  let completedTasks = 0;
  if (teams.length) {
    const teamIds = teams.map((t) => t._id);
    const taskAgg = await Task.aggregate([
      { $match: { team: { $in: teamIds }, isArchived: false } },
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
    if (taskAgg.length) {
      totalTasks = taskAgg[0].totalTasks;
      completedTasks = taskAgg[0].completedTasks;
    }
  }

  const completionRate = totalTasks
    ? Math.round((completedTasks / totalTasks) * 100)
    : 0;

  const activeTasks = totalTasks - completedTasks;

  return {
    totalTeams,
    totalMembers,
    totalTasks,
    activeTasks,
    completedTasks,
    completionRate,
    timestamp: new Date().toISOString(),
  };
}

module.exports = { computeOrganiserSummary };
