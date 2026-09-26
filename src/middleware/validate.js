// Takes a zod schema and returns a middleware that checks req[source] against it.
// source: "body" (default), "query" or "params"
const validate = (schema, source = "body") => (req, res, next) => {
  const result = schema.safeParse(req[source]);

  if (!result.success) {
    return res.status(400).json({
      success: false,
      error: {
        message: "Validation failed",
        details: result.error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      },
    });
  }

  // Replace with cleaned data (e.g. lowercased email, numbers from query strings).
  // In Express 5 req.query is read-only, so validated query goes on req.validatedQuery.
  if (source === "query") {
    req.validatedQuery = result.data;
  } else {
    req[source] = result.data;
  }
  next();
};

module.exports = validate;
