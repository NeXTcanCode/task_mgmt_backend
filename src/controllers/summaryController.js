const Task = require("../models/Task");
const Timelog = require("../models/Timelog");
const dayRange = require("../utils/dayRange");
const { overlapFilter, secondsWithin } = require("../utils/timeWindow");

const brief = (task) => ({ id: task._id, title: task.title });
const open = (task) => ({ ...brief(task), priority: task.priority, dueDate: task.dueDate });

// GET /api/summary/today?tzOffset=-330
const getTodaySummary = async function (req, res) {
  const userId = req.user.id;
  const { start, end, date } = dayRange(req.validatedQuery.tzOffset);
  const now = new Date();

  // Time logs that overlap today, cut at midnight on both sides (a running one counts up to now).
  // A session from 23:00 to 01:00 counts 1h yesterday and 1h today.
  const logs = await Timelog.find(overlapFilter({ userId }, start, end));

  const secondsByTask = {};
  let totalTrackedSeconds = 0;
  logs.forEach((log) => {
    const seconds = secondsWithin(log, start, end, now);
    const key = log.taskId.toString();
    secondsByTask[key] = (secondsByTask[key] || 0) + seconds;
    totalTrackedSeconds += seconds;
  });

  const notDone = { userId, status: { $ne: "completed" } };

  const [workedTasks, completedToday, inProgress, pending, overdue, dueToday] =
    await Promise.all([
      Task.find({ userId, _id: { $in: Object.keys(secondsByTask) } }),
      Task.find({ userId, status: "completed", completedAt: { $gte: start, $lt: end } }),
      Task.find({ userId, status: "in_progress" }).sort({ createdAt: -1 }),
      Task.find({ userId, status: "pending" }).sort({ createdAt: -1 }),
      // dueDate is "YYYY-MM-DD", so comparing with the user's local date string works
      Task.find({ ...notDone, dueDate: { $ne: null, $lt: date } }).sort({ dueDate: 1 }),
      Task.find({ ...notDone, dueDate: date }).sort({ createdAt: -1 }),
    ]);

  res.json({
    success: true,
    data: {
      date,
      totalTrackedSeconds,
      tasksWorkedOn: workedTasks.map((task) => ({
        ...brief(task),
        status: task.status,
        trackedSeconds: secondsByTask[task._id.toString()],
      })),
      completedToday: completedToday.map((task) => ({
        ...brief(task),
        completedAt: task.completedAt,
      })),
      inProgress: inProgress.map(open),
      pending: pending.map(open),
      overdue: overdue.map(open),
      dueToday: dueToday.map(open),
    },
  });
};

module.exports = { getTodaySummary };
