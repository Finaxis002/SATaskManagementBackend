// index.js
const express = require("express");
const http = require("http");
const cors = require("cors");
const dotenv = require("dotenv");
const connectDB = require("./Config/db");
const { initWhatsApp } = require("./whatsapp");
const rateLimit = require("express-rate-limit");
const verifyToken = require("./middleware/verifyToken");
const checkHeaders = require("./middleware/checkHeaders");
const helmet = require("helmet");
const emploeeRoutes = require("./Routes/employeeRoutes");
const taskRoutes = require("./Routes/taskRoutes");
const notificationRoutes = require("./Routes/notificationRoutes");
const cookieParser = require("cookie-parser");
const messageRoute = require("./Routes/messages");
const departmentRoutes = require("./Routes/departmentRoutes");
const taskCodeRoutes = require("./Routes/taskCodeRoutes");
const clientRoutes = require("./Routes/clients");
dotenv.config(); // Load .env
const scheduleTaskRepeats = require("./cron/repeatTaskScheduler");
const MainAdmin = require("./Models/mainAdminCredentials");
const bcrypt = require("bcryptjs");
const leaveRoutes = require("./Routes/leave");
const invoiceRoutes = require("./Routes/invoice");
const sentOtpViewInvoiceRoutes = require("./Routes/sentOtpViewInvoice");
const whatsappRoutes = require("./Routes/whatsappRoute")

scheduleTaskRepeats(); // Initialize the cron job

const app = express();
// Secure headers
app.use(helmet());
const server = http.createServer(app);

app.use(express.json());
app.use(cookieParser());

connectDB();

// Middleware
// Allow both localhost and production frontend URLs
const allowedOrigins = [
  "http://localhost:5173", // for local development

  "https://task-management-software-phi.vercel.app",
  "https://sataskmanagement.onrender.com",
  "https://tasks.sharda.co.in",
];
app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error("CORS blocked this origin"));
    },
    credentials: true,
  })
);

// const apiLimiter = rateLimit({
//   windowMs: 15 * 60 * 1000,
//   max: 100,
//   message: "Too many requests from this IP, please try again later.",
// });
// app.use("/api", apiLimiter);

// app.use("/api", verifyToken, checkHeaders);


app.use("/api/employees", emploeeRoutes);
// app.use('/api/tasks', taskRoutes)
app.use("/api/tasks", taskRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api", messageRoute);

app.use("/api/departments", departmentRoutes);
app.use("/api/task-codes", taskCodeRoutes);
app.use("/api/clients", clientRoutes);
app.use("/api/leave", leaveRoutes);
app.use("/api/invoices", invoiceRoutes);
app.use("/", sentOtpViewInvoiceRoutes);
app.use("/api/whatsapp", whatsappRoutes)
// ⬇️ Attach socket to server AFTER routes
const initSocket = require("./socket/socket");
const { io, userSocketMap } = initSocket(server);


global.io = io;
initWhatsApp(io);
app.set("io", io);
app.set("userSocketMap", userSocketMap);
// app.set("socketManager", socketManager);

// Initialize task reminders with io

const taskReminderService = require("./services/taskReminderService");
// taskReminderService.init(io);
taskReminderService.init(io, userSocketMap);

const leaveNotificationService = require("./services/leaveNotificationService");
leaveNotificationService.init(io, userSocketMap);

// Routes
app.get("/", (req, res) => {
  res.send("Task Management Backend is running - Testing");
});

const insertDefaultAdmin = async () => {
  const exists = await MainAdmin.findOne({ userId: "admin" });
  if (!exists) {
    const hashed = await bcrypt.hash("admin123", 10);
    await MainAdmin.create({
      userId: "admin", // ✅ Add this
      email: "admin@example.com",
      department: "Administrator",
      password: hashed,
    });
    console.log("✅ Default admin credentials created.");
  }
};

insertDefaultAdmin();

// Start server
const PORT = process.env.PORT || 1100;
// app.listen(PORT, () => {
//   console.log(`Server running on port ${PORT}`);
// });
server.listen(PORT, () => {
  console.log(`Server running on port... ${PORT}`);
});
