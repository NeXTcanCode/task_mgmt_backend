const express = require("express");
const {
  getTimeLogs,
  getActiveTimeLog,
  deleteTimeLog,
} = require("../controllers/timeLogController");
const requireAuth = require("../middleware/requireAuth");
const validate = require("../middleware/validate");
const { listTimeLogsQuery } = require("../validators/timeLogValidator");

const router = express.Router();

router.use(requireAuth);

router.get("/", validate(listTimeLogsQuery, "query"), getTimeLogs);
router.get("/active", getActiveTimeLog); // before "/:id"
router.delete("/:id", deleteTimeLog);

module.exports = router;
