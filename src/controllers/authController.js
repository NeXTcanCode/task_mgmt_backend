const User = require("../models/User");
const bcrypt = require("bcryptjs");
const AppError = require("../utils/AppError");
const { setAuthCookie, cookieOptions } = require("../utils/token");

// Only the fields the client should see (never passwordHash)
const publicUser = (user) => ({ id: user._id, name: user.name, email: user.email });

// POST /api/auth/signup
const registerUser = async function (req, res) {
  const { name, email, password } = req.body;

  const existing = await User.findOne({ email });
  if (existing) {
    throw new AppError("Email already registered", 409);
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({ name, email, passwordHash });

  setAuthCookie(res, user._id);
  res.status(201).json({ success: true, data: { user: publicUser(user) } });
};

// POST /api/auth/login
const loginUser = async function (req, res) {
  const { email, password } = req.body;

  // passwordHash has select: false, so ask for it explicitly
  const user = await User.findOne({ email }).select("+passwordHash");
  if (!user) {
    throw new AppError("Invalid email or password", 401);
  }

  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) {
    throw new AppError("Invalid email or password", 401);
  }

  setAuthCookie(res, user._id);
  res.json({ success: true, data: { user: publicUser(user) } });
};

// POST /api/auth/logout
const logoutUser = async function (req, res) {
  // Same options as when set, otherwise the browser may keep the cookie
  res.clearCookie("token", cookieOptions);
  res.json({ success: true, data: null });
};

// GET /api/auth/me
const getMe = async function (req, res) {
  const user = await User.findById(req.user.id);
  if (!user) {
    throw new AppError("User not found", 404);
  }
  res.json({ success: true, data: { user: publicUser(user) } });
};

module.exports = { registerUser, loginUser, logoutUser, getMe };
