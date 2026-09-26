const { z } = require("zod");

// Minutes from JS getTimezoneOffset(); real offsets are between -14h and +12h
const todayQuery = z.object({
  tzOffset: z.coerce.number().int().min(-840).max(720).default(0),
});

module.exports = { todayQuery };
