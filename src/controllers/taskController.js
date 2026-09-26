const mongoose = require("mongoose");
const Task = require("../models/Task");
const Timelog = require("../models/Timelog");
const AppError = require("../utils/AppError");
const { suggestTask } = require("../utils/aiClient");

// Returns { [taskId]: totalSeconds } from finished time logs
const getTotals = async (userId, taskIds) => {
  const rows = await Timelog.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        taskId: { $in: taskIds },
        endTime: { $ne: null },
      },
    },
    { $group: { _id: "$taskId", total: { $sum: "$duration" } } },
  ]);

  const totals = {};
  rows.forEach((row) => (totals[row._id.toString()] = row.total));
  return totals;
};

const withTotal = (task, totals) => ({
  ...task.toJSON(),
  totalTime: totals[task._id.toString()] || 0,
});

// Finds a task only if it belongs to the logged-in user, otherwise 404
const findOwnTask = async (taskId, userId) => {
  const task = await Task.findOne({ _id: taskId, userId });
  if (!task) throw new AppError("Task not found", 404);
  return task;
};

const PRIORITY_RANK = { high: 0, medium: 1, low: 2 };

// Tasks come from the DB newest first; these re-order them (stable sort keeps newest first on ties)
const sorters = {
  newest: () => 0,
  // Earliest due date first, tasks without a due date last
  dueDate: (a, b) => {
    if (a.dueDate === b.dueDate) return 0;
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;
    return a.dueDate < b.dueDate ? -1 : 1;
  },
  priority: (a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority],
};

// POST /api/tasks
const createTask = async function (req, res) {
  const { title, description, rawInput, status, priority, dueDate } = req.body;

  const task = await Task.create({
    userId: req.user.id,
    title,
    description,
    rawInput,
    status,
    priority,
    dueDate,
    completedAt: status === "completed" ? new Date() : null,
  });

  res.status(201).json({ success: true, data: { task: withTotal(task, {}) } });
};

// GET /api/tasks?status=&priority=&sort=newest|dueDate|priority
const getTasks = async function (req, res) {
  const { status, priority, sort } = req.validatedQuery;

  const filter = { userId: req.user.id };
  if (status) filter.status = status;
  if (priority) filter.priority = priority;

  const tasks = await Task.find(filter).sort({ createdAt: -1 });
  tasks.sort(sorters[sort]);
  const totals = await getTotals(req.user.id, tasks.map((t) => t._id));

  res.json({ success: true, data: { tasks: tasks.map((t) => withTotal(t, totals)) } });
};

// GET /api/tasks/:id
const getTask = async function (req, res) {
  const task = await findOwnTask(req.params.id, req.user.id);
  const totals = await getTotals(req.user.id, [task._id]);

  res.json({ success: true, data: { task: withTotal(task, totals) } });
};

// PATCH /api/tasks/:id
const updateTask = async function (req, res) {
  const task = await findOwnTask(req.params.id, req.user.id);
  const { title, description, status, priority, dueDate } = req.body;

  if (title !== undefined) task.title = title;
  if (description !== undefined) task.description = description;
  if (priority !== undefined) task.priority = priority;
  if (dueDate !== undefined) task.dueDate = dueDate; // null clears it

  if (status !== undefined && status !== task.status) {
    task.status = status;
    // completedAt is set when a task becomes completed, cleared otherwise
    task.completedAt = status === "completed" ? new Date() : null;
  }

  await task.save();
  const totals = await getTotals(req.user.id, [task._id]);

  res.json({ success: true, data: { task: withTotal(task, totals) } });
};

// DELETE /api/tasks/:id
const deleteTask = async function (req, res) {
  const task = await findOwnTask(req.params.id, req.user.id);

  await Timelog.deleteMany({ taskId: task._id, userId: req.user.id });
  await task.deleteOne();

  res.json({ success: true, data: null });
};

// POST /api/tasks/ai-suggest
const aiSuggest = async function (req, res) {
  const { input } = req.body;

  try {
    const { title, description } = await suggestTask(input);
    res.json({ success: true, data: { title, description, aiGenerated: true } });
  } catch (error) {
    // AI is optional: fall back to the raw input so task creation never depends on it
    console.warn(`AI suggest failed: ${error.message}`);
    res.json({ success: true, data: { title: input, description: "", aiGenerated: false } });
  }
};

module.exports = { createTask, getTasks, getTask, updateTask, deleteTask, aiSuggest, findOwnTask };
