// index.js
const express = require("express");
const http = require("http");
const cors = require("cors");
const dotenv = require("dotenv");
const connectDB = require("./Config/db");
const emploeeRoutes = require("./Routes/employeeRoutes");
const taskRoutes = require("./Routes/taskRoutes");
const notificationRoutes = require("./Routes/notificationRoutes");
const cookieParser = require("cookie-parser");
const messageRoute = require("./Routes/messages");
const departmentRoutes = require("./Routes/departmentRoutes");
const taskCodeRoutes = require('./Routes/taskCodeRoutes');
const clientRoutes = require("./Routes/clients");
dotenv.config(); // Load .env
const scheduleTaskRepeats = require("./cron/repeatTaskScheduler");
const MainAdmin = require("./Models/mainAdminCredentials");
const bcrypt = require("bcryptjs");



scheduleTaskRepeats(); // Initialize the cron job

const app = express();

const server = http.createServer(app);

app.use(express.json());
app.use(cookieParser());

connectDB();

// Middleware
// Allow both localhost and production frontend URLs
app.use(
  cors({
    origin: [
      "http://localhost:5173", // for local development
      // "https://task-management-software-phi.vercel.app",
      "https://sataskmanagement.onrender.com" // for production
    ],
    credentials: true, // Allow cookies to be sent with the request
  })
);

app.use("/api/employees", emploeeRoutes);
// app.use('/api/tasks', taskRoutes)
app.use("/api/tasks", taskRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api", messageRoute);

app.use("/api/departments", departmentRoutes);
app.use('/api/task-codes', taskCodeRoutes);
app.use("/api/clients", clientRoutes);
// ⬇️ Attach socket to server AFTER routes
const initSocket = require("./socket/socket");
const { io, userSocketMap } = initSocket(server);

// const socketManager = require('./socket/socket');
// const io = socketManager.initSocket(server);

app.set("io", io);
app.set("userSocketMap", userSocketMap);
// app.set("socketManager", socketManager);

// Initialize task reminders with io

const taskReminderService = require('./services/taskReminderService');
// taskReminderService.init(io); 
taskReminderService.init(io, userSocketMap); 

// Routes
app.get("/", (req, res) => {
  res.send("Task Management Backend is running!");
});

const insertDefaultAdmin = async () => {
  const exists = await MainAdmin.findOne({ userId: "admin" });
  if (!exists) {
    const hashed = await bcrypt.hash("admin123", 10);
    await MainAdmin.create({
      userId: "admin",          // ✅ Add this
      email: "admin@example.com",
      department: "Administrator",
      password: hashed
    });
    console.log("✅ Default admin credentials created.");
  }
};


insertDefaultAdmin();

// Start server
const PORT = process.env.PORT || 5000;
// app.listen(PORT, () => {
//   console.log(`Server running on port ${PORT}`);
// });
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
