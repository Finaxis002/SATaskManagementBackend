// /Config/db.js
const mongoose = require('mongoose');
require("dotenv").config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      dbName: 'taskmanagementdb',
      serverSelectionTimeoutMS: 5000, // Adjust this timeout as needed
    });
    
    console.log("✅ MongoDB connected successfully.");
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
