const express = require("express");
const {
  getTimeLogs,
  getActiveTimeLog,
  deleteTimeLog,
} = require("../controllers/timeLogController");
const requireAuth = require("../middleware/requireAuth");
const validate = require("../middleware/validate");
const asyncHandler = require("../utils/asyncHandler");
const { listTimeLogsQuery } = require("../validators/timeLogValidator");

const router = express.Router();

router.use(requireAuth);

router.get("/", validate(listTimeLogsQuery, "query"), asyncHandler(getTimeLogs));
router.get("/active", asyncHandler(getActiveTimeLog)); // before "/:id"
router.delete("/:id", asyncHandler(deleteTimeLog));

module.exports = router;
