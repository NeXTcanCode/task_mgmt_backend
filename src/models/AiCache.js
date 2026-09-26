const mongoose = require("mongoose");

// Cached LLM answers keyed by a hash of model + prompt. Same prompt means the
// underlying data has not changed, so the saved answer can be reused.
const aiCacheSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true, // sha256 of model + prompt
  },
  result: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 60 * 60 * 24, // TTL index: MongoDB deletes entries after 24h
  },
});

module.exports = mongoose.model("AiCache", aiCacheSchema);
