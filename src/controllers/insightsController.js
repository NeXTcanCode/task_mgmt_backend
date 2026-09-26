const Task = require("../models/Task");
const Timelog = require("../models/Timelog");
const AppError = require("../utils/AppError");
const dayRange = require("../utils/dayRange");
const { DAY_MS, overlapFilter, secondsWithin, localDate } = require("../utils/timeWindow");
const { suggestInsights } = require("../utils/aiClient");

const MAX_TASKS = 40; // keeps the prompt small however many tasks the user has
const daysFor = (range) => (range === "month" ? 30 : 7);
const minutes = (seconds) => Math.round(seconds / 60);

// Builds a compact, pre-computed summary for the LLM instead of raw documents.
// The model gets totals to reason about and never has to add up seconds itself.
const contextFor = async (userId, range, tzOffset, taskId) => {
  const days = daysFor(range);
  const { start: todayStart, date: today } = dayRange(tzOffset);
  const from = new Date(todayStart.getTime() - (days - 1) * DAY_MS);
  const now = new Date();

  const match = { userId };
  if (taskId) match.taskId = taskId;
  const logs = await Timelog.find(overlapFilter(match, from, now))
    .select("taskId startTime endTime")
    .lean();

  // Per task: seconds inside the range (a running timer counts up to now) and number of sessions
  const tracked = {};
  logs.forEach((log) => {
    const key = log.taskId.toString();
    tracked[key] = tracked[key] || { seconds: 0, sessions: 0 };
    tracked[key].seconds += secondsWithin(log, from, now, now);
    tracked[key].sessions += 1;
  });

  // Per local day, with sessions that cross midnight split between the two days
  const minutesPerDay = {};
  for (let day = from; day < now; day = new Date(day.getTime() + DAY_MS)) {
    const dayEnd = new Date(day.getTime() + DAY_MS);
    const seconds = logs.reduce((sum, log) => sum + secondsWithin(log, day, dayEnd, now), 0);
    minutesPerDay[localDate(day, tzOffset)] = minutes(seconds);
  }

  // Only tasks that matter for this range: still open, completed in it, or worked on in it
  const taskFilter = taskId
    ? { userId, _id: taskId }
    : {
        userId,
        $or: [
          { status: { $ne: "completed" } },
          { completedAt: { $gte: from } },
          { _id: { $in: Object.keys(tracked) } },
        ],
      };
  const tasks = await Task.find(taskFilter).select("title status priority dueDate completedAt").lean();
  if (taskId && tasks.length === 0) throw new AppError("Task not found", 404);

  const rows = tasks
    .map((task) => {
      const work = tracked[task._id.toString()] || { seconds: 0, sessions: 0 };
      return {
        title: task.title,
        status: task.status,
        priority: task.priority,
        dueDate: task.dueDate || null,
        overdue: task.status !== "completed" && !!task.dueDate && task.dueDate < today,
        completedOn: task.completedAt ? localDate(task.completedAt, tzOffset) : null,
        trackedMinutes: minutes(work.seconds),
        sessions: work.sessions,
      };
    })
    .sort((a, b) => b.trackedMinutes - a.trackedMinutes); // most-worked first, so the cut drops idle tasks

  return {
    range,
    days,
    today,
    totals: {
      trackedMinutes: minutes(Object.values(tracked).reduce((sum, work) => sum + work.seconds, 0)),
      sessions: logs.length,
      timerRunning: logs.some((log) => !log.endTime),
      completedInRange: tasks.filter((task) => task.completedAt && task.completedAt >= from).length,
      openTasks: rows.filter((row) => row.status !== "completed").length,
      overdueTasks: rows.filter((row) => row.overdue).length,
    },
    minutesPerDay,
    tasks: rows.slice(0, MAX_TASKS),
    tasksNotShown: Math.max(0, rows.length - MAX_TASKS),
  };
};

// The LLM is optional: if it fails, the page still works without the AI card
const aiInsights = async (context) => {
  try {
    return { ...(await suggestInsights(context)), aiGenerated: true };
  } catch (error) {
    console.warn(`AI insights failed: ${error.message}`);
    return { summary: "", tips: [], aiGenerated: false };
  }
};

// GET /api/insights?range=week|month&tzOffset=-330
// The context is built outside the AI try/catch: a bad id or a missing task is a real
// error (404), not "AI unavailable".
const getInsights = async (req, res) => {
  const { range, tzOffset } = req.validatedQuery;
  const context = await contextFor(req.user.id, range, tzOffset);
  res.json({ success: true, data: await aiInsights(context) });
};

// GET /api/tasks/:id/insights?tzOffset=-330
const getTaskInsights = async (req, res) => {
  const { tzOffset } = req.validatedQuery;
  const context = await contextFor(req.user.id, "week", tzOffset, req.params.id);
  res.json({ success: true, data: await aiInsights(context) });
};

module.exports = { getInsights, getTaskInsights };
