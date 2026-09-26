const jwt = require("jsonwebtoken");
const AppError = require("../utils/AppError");

const requireAuth = function (req, res, next) {
  const token = req.cookies.token;
  if (!token) {
    return next(new AppError("Not authenticated", 401));
  }
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: payload.id };
    next();
  } catch (e) {
    return next(new AppError("Invalid or expired token", 401));
  }
};

module.exports = requireAuth;
