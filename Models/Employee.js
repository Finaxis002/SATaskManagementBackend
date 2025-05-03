const mongoose = require("mongoose");

const EmployeeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  position: { type: String, required: true },
  department: { 
    type: [String], 
    required: true // ✅ keep required
    // 🔴 REMOVE enum and default if you're accepting dynamic departments
  },
  userId: { type: String, required: true },
  password: { type: String, required: true },
  role: { 
    type: String, 
    enum: ['user', 'admin', 'manager'],
    default: 'user'
  },
  createdAt: { type: Date, default: Date.now },
});


module.exports = mongoose.model("Employee", EmployeeSchema);
