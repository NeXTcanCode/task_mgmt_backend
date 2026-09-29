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
const asyncHandler = require("../utils/asyncHandler");
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
router.post("/ai-suggest", aiLimiter, validate(aiSuggestSchema), asyncHandler(aiSuggest));
router.get("/:id/insights", aiLimiter, validate(insightsQuery, "query"), asyncHandler(getTaskInsights));

router.post("/", validate(createTaskSchema), asyncHandler(createTask));
router.get("/", validate(listTasksQuery, "query"), asyncHandler(getTasks));
router.get("/:id", asyncHandler(getTask));
router.patch("/:id", validate(updateTaskSchema), asyncHandler(updateTask));
router.delete("/:id", asyncHandler(deleteTask));

router.post("/:id/timer/start", asyncHandler(startTimer));
router.post("/:id/timer/stop", asyncHandler(stopTimer));

module.exports = router;
