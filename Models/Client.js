// models/Client.js
const mongoose = require("mongoose");

const clientSchema = new mongoose.Schema({
  name: { type: String, required: true },
  taskId: { type: mongoose.Schema.Types.ObjectId, ref: "Task", required: true, unique: true }, // 👈 Ensure 1 client per task
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Client", clientSchema);
