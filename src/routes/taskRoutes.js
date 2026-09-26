const express = require("express");
const {
  createTask,
  getTasks,
  getTask,
  updateTask,
  deleteTask,
  aiSuggest,
} = require("../controllers/taskController");
const { startTimer, stopTimer } = require("../controllers/timeLogController");
const { getTaskInsights } = require("../controllers/insightsController");
const requireAuth = require("../middleware/requireAuth");
const validate = require("../middleware/validate");
const { aiLimiter } = require("../middleware/rateLimiter");
const {
  createTaskSchema,
  updateTaskSchema,
  listTasksQuery,
  aiSuggestSchema,
} = require("../validators/taskValidator");
const { insightsQuery } = require("../validators/insightsValidator");

const router = express.Router();

// Every task route needs a logged-in user
router.use(requireAuth);

// Must come before "/:id" routes
router.post("/ai-suggest", aiLimiter, validate(aiSuggestSchema), aiSuggest);
router.get("/:id/insights", aiLimiter, validate(insightsQuery, "query"), getTaskInsights);

router.post("/", validate(createTaskSchema), createTask);
router.get("/", validate(listTasksQuery, "query"), getTasks);
router.get("/:id", getTask);
router.patch("/:id", validate(updateTaskSchema), updateTask);
router.delete("/:id", deleteTask);

router.post("/:id/timer/start", startTimer);
router.post("/:id/timer/stop", stopTimer);

module.exports = router;
