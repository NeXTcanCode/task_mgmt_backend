const { z } = require("zod");

const email = z.string().trim().toLowerCase().email("Invalid email");

const signupSchema = z.object({
  name: z.string().trim().min(2).max(50),
  email,
  password: z.string().min(8).max(72), // bcrypt only uses the first 72 bytes
});

const loginSchema = z.object({
  email,
  password: z.string().min(1, "Password is required"),
});

module.exports = { signupSchema, loginSchema };
