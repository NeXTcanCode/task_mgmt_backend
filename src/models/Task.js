const mongoose = require("mongoose");
const toJSON = require("../utils/toJSON");

const taskSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      default: "",
      maxlength: 2000,
    },
    rawInput: {
      type: String,
    },
    status: {
      type: String,
      enum: ["pending", "in_progress", "completed"],
      default: "pending",
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },
    // Calendar day "YYYY-MM-DD" (not a timestamp), so it never shifts with timezones
    dueDate: {
      type: String,
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true, toJSON }
);

taskSchema.index({ userId: 1, createdAt: -1 }); // task list
taskSchema.index({ userId: 1, completedAt: 1 }); // daily summary

module.exports = mongoose.model("Task", taskSchema);
