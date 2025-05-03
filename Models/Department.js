const mongoose = require("mongoose");

const DepartmentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,  // Prevent duplicates
    trim: true,
  },
});

module.exports = mongoose.models.Department || mongoose.model("Department", DepartmentSchema);
