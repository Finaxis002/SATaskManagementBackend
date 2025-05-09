const mongoose = require("mongoose");

const MainAdminSchema = new mongoose.Schema({
  userId: { type: String, required: true, default: "admin" },
  email: { type: String, required: true, default: "admin@example.com" },
  password: { type: String, required: true }, // hashed
  role: { type: String, default: "admin" },
  department: { type: String, default: "Administrator" },
});

module.exports = mongoose.model("MainAdmin", MainAdminSchema);
