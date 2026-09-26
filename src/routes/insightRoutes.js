const express = require("express");
const requireAuth = require("../middleware/requireAuth");
const validate = require("../middleware/validate");
const { aiLimiter } = require("../middleware/rateLimiter");
const { insightsQuery } = require("../validators/insightsValidator");
const { getInsights } = require("../controllers/insightsController");

const router = express.Router();
router.get("/", requireAuth, aiLimiter, validate(insightsQuery, "query"), getInsights);
module.exports = router;
