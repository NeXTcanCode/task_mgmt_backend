const express = require("express");
const { getTodaySummary } = require("../controllers/summaryController");
const requireAuth = require("../middleware/requireAuth");
const validate = require("../middleware/validate");
const { todayQuery } = require("../validators/summaryValidator");

const router = express.Router();

router.get("/today", requireAuth, validate(todayQuery, "query"), getTodaySummary);

module.exports = router;
