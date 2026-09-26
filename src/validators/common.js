const { z } = require("zod");

// A MongoDB ObjectId is 24 hex characters
const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid id");

module.exports = { objectId };
