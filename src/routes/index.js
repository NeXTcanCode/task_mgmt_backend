const express = require("express");
const authRoutes = require("./authRoutes");
const taskRoutes = require("./taskRoutes");
const timeLogRoutes = require("./timeLogRoutes");
const summaryRoutes = require("./summaryRoutes");
const insightRoutes = require("./insightRoutes");

const router = express.Router();

router.get("/health", (req, res) => res.json({ success: true, data: { status: "ok" } }));

router.use("/auth", authRoutes);
router.use("/tasks", taskRoutes);
router.use("/timelogs", timeLogRoutes);
router.use("/summary", summaryRoutes);
router.use("/insights", insightRoutes);

module.exports = router;
