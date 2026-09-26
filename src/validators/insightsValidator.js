const { z } = require("zod");

const insightsQuery = z.object({
  range: z.enum(["week", "month"]).default("week"),
  tzOffset: z.coerce.number().int().min(-840).max(720).default(0),
});

module.exports = { insightsQuery };
