// models/Client.js
const mongoose = require("mongoose");

// models/Client.js
const clientSchema = new mongoose.Schema({
  name: { type: String, required: true },
  taskId: { type: mongoose.Schema.Types.ObjectId, ref: "Task", required: false, unique: true }, // ✅ Make this optional
  createdAt: { type: Date, default: Date.now },
});


module.exports = mongoose.model("Client", clientSchema);
