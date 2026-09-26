require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const morgan = require("morgan");
const connectDB = require("./config/db");
const routes = require("./routes");
const notFound = require("./middleware/notFound");
const errorHandler = require("./middleware/errorHandler");

const app = express();
const PORT = process.env.PORT || 3000;

// Render sits behind a proxy: trust it so req.ip (used by the rate limiter) is the real user IP
app.set("trust proxy", 1);

app.use(helmet());
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
    credentials: true, // allow the cookie to be sent
  })
);
app.use(express.json());
app.use(cookieParser());
// Log the path only. Query strings can contain user data or credentials.
app.use(morgan((tokens, req, res) => [
  tokens.method(req, res),
  req.path,
  tokens.status(req, res),
  tokens.res(req, res, "content-length"), "-",
  tokens["response-time"](req, res), "ms",
].join(" ")));

app.use("/api", routes);

// These two must come after all routes
app.use(notFound);
app.use(errorHandler);

async function startServer() {
  try {
    // Fail at startup, not on the first login
    if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET is not set in .env");
    await connectDB();
    console.log("DB connection was successful");
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  } catch (error) {
    console.error(`Server failed to start: ${error.message}`);
    process.exit(1);
  }
}

startServer();
