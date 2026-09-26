const { z } = require("zod");
const { objectId } = require("./common");

const listTimeLogsQuery = z.object({
  taskId: objectId.optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

module.exports = { listTimeLogsQuery };
