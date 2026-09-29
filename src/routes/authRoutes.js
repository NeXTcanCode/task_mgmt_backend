const express = require("express");
const { registerUser, loginUser, logoutUser, getMe } = require("../controllers/authController");
const requireAuth = require("../middleware/requireAuth");
const validate = require("../middleware/validate");
const { authLimiter } = require("../middleware/rateLimiter");
const { signupSchema, loginSchema } = require("../validators/authValidator");
const asyncHandler = require("../utils/asyncHandler");

const router = express.Router();

router.post("/signup", authLimiter, validate(signupSchema), asyncHandler(registerUser));
router.post("/login", authLimiter, validate(loginSchema), asyncHandler(loginUser));
router.post("/logout", asyncHandler(logoutUser));
router.get("/me", requireAuth, asyncHandler(getMe));

module.exports = router;
