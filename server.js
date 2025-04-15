// index.js
const express = require('express');
const http = require('http'); 
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require("./Config/db")
const emploeeRoutes = require ("./Routes/employeeRoutes")
const taskRoutes = require('./Routes/taskRoutes')
const notificationRoutes = require('./Routes/notificationRoutes')
const cookieParser = require("cookie-parser");



dotenv.config(); // Load .env


const app = express();

const server = http.createServer(app); 

app.use(express.json());
app.use(cookieParser());

connectDB();

// Middleware
app.use(cors({
  origin: "http://localhost:5173", // 👈 your frontend Vite dev server
  credentials: true,              // ✅ allow cookies to be sent
}));



app.use("/api/employees", emploeeRoutes);
// app.use('/api/tasks', taskRoutes)
app.use("/api/tasks", taskRoutes);
app.use("/api/notifications", notificationRoutes);

// ⬇️ Attach socket to server AFTER routes
const initSocket = require("./socket/socket");
const { io, userSocketMap } = initSocket(server);
app.set("io", io);
app.set("userSocketMap", userSocketMap);

// Routes
app.get('/', (req, res) => {
  res.send('Task Management Backend is running!');
});



// Start server
const PORT = process.env.PORT || 5000;
// app.listen(PORT, () => {
//   console.log(`Server running on port ${PORT}`);
// });
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

