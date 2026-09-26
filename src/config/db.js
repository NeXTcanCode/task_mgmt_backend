const mongoose = require("mongoose");

async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set in .env");

  // No try/catch here: if it fails, the error goes to startServer() in server.js
  await mongoose.connect(uri);
}

module.exports = connectDB;
