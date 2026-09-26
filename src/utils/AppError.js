// Error with an HTTP status code. Throw it anywhere; errorHandler formats the response.
class AppError extends Error {
  constructor(message, statusCode = 500, details) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
  }
}

module.exports = AppError;
