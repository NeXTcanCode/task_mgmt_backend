const jwt = require("jsonwebtoken");

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "1d",
  });

// Frontend (Netlify) and backend (Render) are on different domains, so the cookie
// must be sameSite "none" + secure there. Locally "lax" is enough. Whether we're in
// production is decided by the request's Origin header, so it can't silently break
// when NODE_ENV is unset (as on Render by default).
const cookieOptionsFor = (req) => {
  const crossSite = !req.headers.origin || !/^http:\/\/localhost/.test(req.headers.origin);
  return {
    httpOnly: true,
    secure: crossSite,
    sameSite: crossSite ? "none" : "lax",
    path: "/",
  };
};

// Signs a JWT and sets it as the auth cookie. The cookie expires exactly when the
// token does, so changing JWT_EXPIRES_IN can't leave the two out of step.
const setAuthCookie = (res, userId) => {
  const token = signToken(userId);
  const { exp } = jwt.decode(token);
  res.cookie("token", token, { ...cookieOptionsFor(res.req), expires: new Date(exp * 1000) });
};

module.exports = { setAuthCookie, cookieOptionsFor };