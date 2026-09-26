const jwt = require("jsonwebtoken");

const isProduction = process.env.NODE_ENV === "production";

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "1d",
  });

// Frontend (Netlify) and backend (Render) are on different domains in production,
// so the cookie must be sameSite "none" + secure there. Locally "lax" is enough.
const cookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? "none" : "lax",
  path: "/",
};

// Signs a JWT and sets it as the auth cookie. The cookie expires exactly when the
// token does, so changing JWT_EXPIRES_IN can't leave the two out of step.
const setAuthCookie = (res, userId) => {
  const token = signToken(userId);
  const { exp } = jwt.decode(token);
  res.cookie("token", token, { ...cookieOptions, expires: new Date(exp * 1000) });
};

module.exports = { setAuthCookie, cookieOptions };
