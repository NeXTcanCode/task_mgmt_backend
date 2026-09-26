const { z } = require("zod");

const status = z.enum(["pending", "in_progress", "completed"]);
const priority = z.enum(["low", "medium", "high"]);
// "YYYY-MM-DD" (what <input type="date"> gives); null clears it
const dueDate = z.iso.date("Due date must be YYYY-MM-DD").nullable();

const createTaskSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  description: z.string().trim().max(2000).optional(),
  rawInput: z.string().trim().max(2000).optional(),
  status: status.optional(),
  priority: priority.optional(),
  dueDate: dueDate.optional(),
});

const updateTaskSchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    description: z.string().trim().max(2000).optional(),
    status: status.optional(),
    priority: priority.optional(),
    dueDate: dueDate.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Provide at least one field to update",
  });

const listTasksQuery = z.object({
  status: status.optional(),
  priority: priority.optional(),
  sort: z.enum(["newest", "dueDate", "priority"]).default("newest"),
});

const aiSuggestSchema = z.object({
  input: z.string().trim().min(1, "Input is required").max(500),
});

module.exports = { createTaskSchema, updateTaskSchema, listTasksQuery, aiSuggestSchema };
