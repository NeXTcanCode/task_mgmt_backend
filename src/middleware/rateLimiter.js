const { rateLimit } = require("express-rate-limit");

const tooManyRequests = (req, res) => {
  res.status(429).json({
    success: false,
    error: { message: "Too many requests, please try again later" },
  });
};

// Max 20 auth requests per IP every 15 minutes (brute-force protection)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: tooManyRequests,
});

// Max 30 AI requests per user every 15 minutes, shared by all AI endpoints.
// Every call costs an LLM request, so one account can't run up the bill.
// Counted per user (not per IP), so it must come after requireAuth.
const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user.id,
  handler: tooManyRequests,
});

module.exports = { authLimiter, aiLimiter };
