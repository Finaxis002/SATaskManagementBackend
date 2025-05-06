// models/Client.js
const mongoose = require("mongoose");

const clientSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true }, // Assuming unique client names
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Client", clientSchema);
