// models/Client.js
const mongoose = require("mongoose");

// models/Client.js
const clientSchema = new mongoose.Schema({
  name: { type: String, required: true },
  contactPerson: { type: String }, // Name of contact person
  businessName: { type: String },
  address: { type: String },
  mobile: { type: String },
  emailId: { type: String },
  GSTIN: { type: String },
  createdAt: { type: Date, default: Date.now },
});


module.exports = mongoose.model("Client", clientSchema);
