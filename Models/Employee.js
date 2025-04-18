const mongoose = require("mongoose");

const EmployeeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  position: { type: String, required: true },
  department: { 
    type: String, 
    enum: ['Marketing', 'Sales', 'Operations', 'IT/Software', 'HR', 'Administrator'],  // Optional predefined values
    default: 'Marketing'  // Default department value
  },
  userId: { type: String, required: true },  // Changed from ObjectId to String
  password: { type: String, required: true },
  role: { 
    type: String, 
    enum: ['user', 'admin', 'manager'],  // Allowed roles
    default: 'user'  // Default role value
  },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Employee", EmployeeSchema);
