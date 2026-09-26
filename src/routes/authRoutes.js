const express = require("express");
const { registerUser, loginUser, logoutUser, getMe } = require("../controllers/authController");
const requireAuth = require("../middleware/requireAuth");
const validate = require("../middleware/validate");
const { authLimiter } = require("../middleware/rateLimiter");
const { signupSchema, loginSchema } = require("../validators/authValidator");

const router = express.Router();

router.post("/signup", authLimiter, validate(signupSchema), registerUser);
router.post("/login", authLimiter, validate(loginSchema), loginUser);
router.post("/logout", logoutUser);
router.get("/me", requireAuth, getMe);

module.exports = router;
