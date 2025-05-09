const mongoose = require("mongoose");

const mainAdminSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  email: String,
  department: String
});

module.exports = mongoose.model("MainAdmin", mainAdminSchema);
