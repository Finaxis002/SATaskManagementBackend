// index.js
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require("./Config/db")
const emploeeRoutes = require ("./Routes/employeeRoutes")

const taskRoutes = require('./Routes/taskRoutes')

const cookieParser = require("cookie-parser");



dotenv.config(); // Load .env


const app = express();
app.use(express.json());
app.use(cookieParser());

connectDB();

// Middleware
// Allow both localhost and production frontend URLs
app.use(cors({
  origin: [
    'http://localhost:5173', // for local development
    'https://task-management-software-phi.vercel.app', // for production
  ],
  credentials: true, // Allow cookies to be sent with the request
}));


app.use("/api/employees", emploeeRoutes);
app.use('/api/tasks', taskRoutes)



app.use("/api/tasks", taskRoutes);

// Routes
app.get('/', (req, res) => {
  res.send('Task Management Backend is running!');
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
