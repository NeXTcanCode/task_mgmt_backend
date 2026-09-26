const Timelog = require("../models/Timelog");
const AppError = require("../utils/AppError");
const { findOwnTask } = require("./taskController");

// Shape from API_CONTRACTS: taskId plus a small task object
const formatLog = (log) => {
  const json = log.toJSON();
  const task = log.taskId;

  // taskId is populated ({ _id, title }) in list responses, a plain id otherwise
  if (task && task.title !== undefined) {
    json.taskId = task._id;
    json.task = { id: task._id, title: task.title };
  }
  return json;
};

// POST /api/tasks/:id/timer/start
const startTimer = async function (req, res) {
  const task = await findOwnTask(req.params.id, req.user.id);

  // { $type: "null" } (not just null) so MongoDB can use the partial running-timer index
  const running = await Timelog.findOne({ userId: req.user.id, endTime: { $type: "null" } });
  if (running) {
    throw new AppError("A timer is already running", 409, { taskId: running.taskId });
  }

  // Server sets the start time, never the client
  const timeLog = await Timelog.create({
    userId: req.user.id,
    taskId: task._id,
    startTime: new Date(),
  });

  // Starting work on a pending task moves it to in_progress
  if (task.status === "pending") {
    task.status = "in_progress";
    await task.save();
  }

  res.status(201).json({ success: true, data: { timeLog: formatLog(timeLog) } });
};

// POST /api/tasks/:id/timer/stop
const stopTimer = async function (req, res) {
  const timeLog = await Timelog.findOne({
    userId: req.user.id,
    taskId: req.params.id,
    endTime: { $type: "null" },
  });
  if (!timeLog) {
    throw new AppError("No running timer for this task", 404);
  }

  timeLog.endTime = new Date();
  timeLog.duration = Math.round((timeLog.endTime - timeLog.startTime) / 1000);
  await timeLog.save();

  res.json({ success: true, data: { timeLog: formatLog(timeLog) } });
};

// GET /api/timelogs?taskId=&from=&to=
const getTimeLogs = async function (req, res) {
  const { taskId, from, to } = req.validatedQuery;

  const filter = { userId: req.user.id };
  if (taskId) filter.taskId = taskId;
  if (from || to) {
    filter.startTime = {};
    if (from) filter.startTime.$gte = from;
    if (to) filter.startTime.$lte = to;
  }

  const logs = await Timelog.find(filter)
    .sort({ startTime: -1 })
    .populate("taskId", "title");

  res.json({ success: true, data: { timeLogs: logs.map(formatLog) } });
};

// GET /api/timelogs/active
const getActiveTimeLog = async function (req, res) {
  const log = await Timelog.findOne({ userId: req.user.id, endTime: { $type: "null" } }).populate(
    "taskId",
    "title"
  );

  res.json({ success: true, data: { timeLog: log ? formatLog(log) : null } });
};

// DELETE /api/timelogs/:id
const deleteTimeLog = async function (req, res) {
  const log = await Timelog.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
  if (!log) {
    throw new AppError("Time log not found", 404);
  }

  res.json({ success: true, data: null });
};

module.exports = { startTimer, stopTimer, getTimeLogs, getActiveTimeLog, deleteTimeLog };
