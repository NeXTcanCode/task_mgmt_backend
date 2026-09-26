const AppError = require("../utils/AppError");

// Runs when no route matched
const notFound = (req, res, next) => {
  // Do not reflect query strings: they can contain tokens or other sensitive values.
  next(new AppError(`Route not found: ${req.method} ${req.path}`, 404));
};

module.exports = notFound;
