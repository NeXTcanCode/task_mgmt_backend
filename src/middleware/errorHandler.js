// Single place that turns every error into the same response shape.
// Express knows this is an error handler because it has 4 arguments.
const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message;

  // Invalid MongoDB ObjectId in the URL, e.g. /api/tasks/abc
  if (err.name === "CastError") {
    statusCode = 404;
    message = "Resource not found";
  }

  // Unique index violation (email already used, or a second running timer)
  if (err.code === 11000) {
    statusCode = 409;
    message = err.keyPattern?.email
      ? "Email already registered"
      : "A timer is already running";
  }

  // Broken JSON in the request body
  if (err.type === "entity.parse.failed") {
    statusCode = 400;
    message = "Invalid JSON body";
  }

  // Never leak internal details for unexpected errors
  if (statusCode === 500) {
    console.error(err);
    message = "Something went wrong";
  }

  const error = { message };
  if (err.details) error.details = err.details;

  res.status(statusCode).json({ success: false, error });
};

module.exports = errorHandler;
