// index.js
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require("./Config/db")
const emploeeRoutes = require ("./Routes/employeeRoutes")


dotenv.config(); // Load .env


const app = express();

connectDB();

// Middleware
app.use(cors());
app.use(express.json());


app.use("/api/employees", emploeeRoutes);

// Routes
app.get('/', (req, res) => {
  res.send('Task Management Backend is running!');
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
