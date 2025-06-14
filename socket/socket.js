

const { Server } = require("socket.io");
const { sendLoginReminders } = require("../services/taskReminderService"); // 🔁 Import your reminder function
// ✅ Keep both mappings
global.userSocketMap = global.userSocketMap || {}; // email => socket.id (GLOBAL for reminders)
const socketUserMap = {};                           // socket.id => email (LOCAL for disconnect)

const initSocket = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: [
        "http://localhost:5173",
        "https://task-management-software-phi.vercel.app",
        "https://sataskmanagement.onrender.com"
      ],
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    console.log("🟢 Socket connected:", socket.id);

    socket.on("register", (email, username) => {
      if (email && username) {
        global.userSocketMap[email] = socket.id;    // ✅ Save globally
        socketUserMap[socket.id] = email;            // ✅ Save locally
        console.log(`${username} connected with socket ID: ${socket.id}`);
        console.log('userSocketMap:', global.userSocketMap);
         require('../services/leaveNotificationService').init(io, global.userSocketMap);
      } else {
        console.log("❌ Registration failed, email or username missing");
      }
    });


    // 🔔 On-demand login reminder trigger
    socket.on("request-login-reminder", async (email) => {
      try {
        await sendLoginReminders(email);  // 🔁 Use your actual reminder logic
        console.log("✅ Task-based login reminders sent to:", email);
      } catch (err) {
        console.error("❌ Error sending login reminders via socket:", err);
      }
    });


    // ✅ Task Reminder Event
    socket.on("task-reminder", (data) => {
      const { assigneeEmail, message } = data;
      const socketId = global.userSocketMap[assigneeEmail];

      if (socketId) {
        io.to(socketId).emit("task-reminder", message);
        console.log("🔔 Sent reminder to:", assigneeEmail);
      } else {
        console.log("No socket found for assignee:", assigneeEmail);
      }
    });

    // ✅ Chat message event
    socket.on("sendMessage", (msg) => {
      io.emit("receiveMessage", msg);
      io.emit("inboxCountUpdated");
      console.log("📨 Broadcasting message:", msg);
    });

    socket.on("inboxRead", () => {
      io.emit("inboxCountUpdated");
    });

    // ✅ Handle disconnections properly
    socket.on("disconnect", () => {
      const email = socketUserMap[socket.id]; // Get email by socket id

      if (email) {
        delete global.userSocketMap[email];  // ✅ Remove from global mapping
        delete socketUserMap[socket.id];      // ✅ Remove from local mapping
        console.log(`❌ Disconnected: ${email}`);
      }
    });
  });

  return { io, userSocketMap: global.userSocketMap, socketUserMap };
};

module.exports = initSocket;

