const express = require("express");
const { getTodaySummary } = require("../controllers/summaryController");
const requireAuth = require("../middleware/requireAuth");
const validate = require("../middleware/validate");
const asyncHandler = require("../utils/asyncHandler");
const { todayQuery } = require("../validators/summaryValidator");

const router = express.Router();

router.get("/today", requireAuth, validate(todayQuery, "query"), asyncHandler(getTodaySummary));

module.exports = router;
