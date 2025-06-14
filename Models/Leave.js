const mongoose = require("mongoose");

const LeaveSchema = new mongoose.Schema({
  userId: { type: String, required: true }, // Add this field
  userName: { type: String, required: true },
  fromDate: { type: Date, required: true },
  toDate: { type: Date, required: true },
  leaveType: { type: String, required: true },
  comments: { type: String },
  status: { type: String, default: "Pending" },
  createdAt: { type: Date, default: Date.now },
  fromTime: { type: String, default: "" }, 
  toTime: { type: String, default: "" },   
});

module.exports = mongoose.model("Leave", LeaveSchema);
