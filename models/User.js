const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  email: { type: String, required: true },
  password: { type: String, required: true },
  dailyCount: { type: Number, default: 0 },
  lastReset: { type: String, default: null }
});

module.exports = mongoose.model("User", userSchema);
