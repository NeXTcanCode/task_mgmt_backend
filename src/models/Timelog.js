const mongoose = require("mongoose");
const toJSON = require("../utils/toJSON");

const timelogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    taskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Task",
      required: true,
    },
    startTime: {
      type: Date,
      required: true,
    },
    endTime: {
      type: Date,
      default: null, // null = timer is running
    },
    duration: {
      type: Number,
      default: 0, // seconds, calculated on stop
    },
  },
  { timestamps: true, toJSON }
);

timelogSchema.index({ userId: 1, startTime: -1 }); // time log list
timelogSchema.index({ taskId: 1 }); // per-task totals
timelogSchema.index({ userId: 1, endTime: 1 }); // logs overlapping a day/range (summary, insights)

// Database-level guarantee: only one running timer (endTime null) per user
timelogSchema.index(
  { userId: 1 },
  { unique: true, partialFilterExpression: { endTime: { $type: "null" } } }
);

module.exports = mongoose.model("Timelog", timelogSchema);
