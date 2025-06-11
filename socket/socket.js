// const { Server } = require("socket.io");
// const ChatMessage = require("../Models/ChatMessage");

// const userSocketMap = {}; // email => socket.id

// const initSocket = (httpServer) => {
//   const io = new Server(httpServer, {
//     cors: {
//       origin: [
//         "http://localhost:5173", // Your local frontend URL
//         "https://task-management-software-phi.vercel.app", // Production frontend URL
//       ],
//       methods: ["GET", "POST"],
//       credentials: true,
//     },
//   });

//   io.on("connection", (socket) => {
//     console.log("🟢 Socket connected:", socket.id);

//     // Register socket with user email
//     // socket.on("register", (email, username) => {

//     //   userSocketMap[email] = socket.id;
//     //   console.log(`${email} connected with socket ID: ${socket.id}`);
//     //   userSocketMap[socket.id] = username; // Store socket ID with the user's name
//     //   console.log(`${username} connected`);
//     // });

//      socket.on("register", (email, username) => {
//     if (email && username) {
//       userSocketMap[email] = socket.id;
//       console.log(`${username} connected with socket ID: ${socket.id}`);
//       console.log('userSocketMap', userSocketMap)
//     } else {
//       console.log("❌ Registration failed, email or username missing");
//     }
//   });

//      // Listen for task reminder events
//      socket.on("task-reminder", (data) => {
//       const { assigneeEmail, message } = data;

//       // Send reminder only to the assignee's socket ID
//       const socketId = userSocketMap[assigneeEmail];  // Retrieve socket ID by assignee's email

//       if (socketId) {
//         io.to(socketId).emit("task-reminder", message);  // Emit reminder only to the assignee
//         console.log("Sent reminder to:", assigneeEmail);
//       } else {
//         console.log("No socket found for assignee:", assigneeEmail);
//       }
//     });

//     socket.on("sendMessage", (msg) => {
//       io.emit("receiveMessage", msg); // ✅ Send to all including sender
//       io.emit("inboxCountUpdated");
//       console.log("📨 Broadcasting message:", msg);
//     });

//     // ✅ When inbox is read, reset count
//     socket.on("inboxRead", () => {
//       io.emit("inboxCountUpdated"); // let all clients update their badge
//     });

//     // Handle private messages
//     socket.on("sendPrivateMessage", (data) => {
//       const { receiver, message } = data;
//       const receiverSocket = Object.keys(users).find(
//         (socketId) => users[socketId] === receiver
//       );

//       if (receiverSocket) {
//         io.to(receiverSocket).emit("receivePrivateMessage", message);
//       }
//     });

//     // Handle socket disconnections

//     socket.on("disconnect", () => {
//       const email = Object.keys(userSocketMap).find(
//         (key) => userSocketMap[key] === socket.id
//       );
//       if (email) {
//         delete userSocketMap[email];
//         console.log(`❌ Disconnected: ${email}`);
//       }
//     });
//   });

//   return { io, userSocketMap };
// };

// module.exports = initSocket;

//////////////////////////////////////////////////////////////////////////////////////////////

// const { Server } = require("socket.io");
// const ChatMessage = require("../Models/ChatMessage");
// const userSocketMap = {};

// // const userSocketMap = {}; // email => socket.id

// const socketManager = {
//   userSocketMap: {},

//  initSocket(httpServer){
//   const io = new Server(httpServer, {
//     cors: {
//       origin: [
//         "http://localhost:5173", // Your local frontend URL
//         "https://task-management-software-phi.vercel.app", // Production frontend URL
//       ],
//       methods: ["GET", "POST"],
//       credentials: true,
//     },
//   });

//   io.on("connection", (socket) => {
//     console.log("🟢 Socket connected:", socket.id);

//     // Register socket with user email
//     // socket.on("register", (email, username) => {

//     //   userSocketMap[email] = socket.id;
//     //   console.log(`${email} connected with socket ID: ${socket.id}`);
//     //   userSocketMap[socket.id] = username; // Store socket ID with the user's name
//     //   console.log(`${username} connected`);
//     // });

//      socket.on("register", (email, username) => {
//     if (email && username) {
//       userSocketMap[email] = socket.id;
//       console.log(`${username} connected with socket ID: ${socket.id}`);
//       console.log("userSocketMap:", userSocketMap);
//     } else {
//       console.log("❌ Registration failed, email or username missing");
//     }
//   });

//      // Listen for task reminder events
//      socket.on("task-reminder", (data) => {

//       const { assigneeEmail, message } = data;

//       // Send reminder only to the assignee's socket ID
//       const socketId = userSocketMap['user1@gmail.com'];  // Retrieve socket ID by assignee's email

//       if (socketId) {
//         io.to(socketId).emit("task-reminder", message);  // Emit reminder only to the assignee
//         console.log("Sent reminder to:", assigneeEmail);
//       } else {
//         console.log("No socket found for assignee:", assigneeEmail);
//       }
//     });

//     socket.on("sendMessage", (msg) => {
//       io.emit("receiveMessage", msg); // ✅ Send to all including sender
//       io.emit("inboxCountUpdated");
//       console.log("📨 Broadcasting message:", msg);
//     });

//     // ✅ When inbox is read, reset count
//     socket.on("inboxRead", () => {
//       io.emit("inboxCountUpdated"); // let all clients update their badge
//     });

//     // Handle private messages
//     socket.on("sendPrivateMessage", (data) => {
//       const { receiver, message } = data;
//       const receiverSocket = Object.keys(users).find(
//         (socketId) => users[socketId] === receiver
//       );

//       if (receiverSocket) {
//         io.to(receiverSocket).emit("receivePrivateMessage", message);
//       }
//     });

//     // Handle socket disconnections

//     socket.on("disconnect", () => {
//       const email = Object.keys(socketManager.userSocketMap).find(
//         (key) => socketManager.userSocketMap[key] === socket.id
//       );
//       if (email) {
//         delete userSocketMap[email];
//         console.log(`❌ Disconnected: ${email}`);
//       }
//     });
//   });

//   return io;
// },
// getSocketMap() {
//   return this.userSocketMap;
// }
// };

// module.exports = socketManager;

////////////////////////////////////////////////////////////////////////////////

const { Server } = require("socket.io");
const { sendLoginReminders } = require("../services/taskReminderService"); // 🔁 Import your reminder function
// ✅ Keep both mappings
global.userSocketMap = global.userSocketMap || {}; // email => socket.id (GLOBAL for reminders)
const socketUserMap = {}; // socket.id => email (LOCAL for disconnect)

const initSocket = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: [
        "http://localhost:5173",
        "https://task-management-software-phi.vercel.app",
        "https://sataskmanagement.onrender.com",
      ],
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

let leaveNotifierInitialized = false;

  io.on("connection", (socket) => {
    console.log("🟢 Socket connected:", socket.id);

    // old and working socket registration
    // socket.on("register", (email, username) => {
    //   if (email && username) {
    //     global.userSocketMap[email] = socket.id;    // ✅ Save globally
    //     socketUserMap[socket.id] = email;            // ✅ Save locally
    //     console.log(`${username} connected with socket ID: ${socket.id}`);
    //     console.log('userSocketMap:', global.userSocketMap);
    //      require('../services/leaveNotificationService').init(io, global.userSocketMap);
    //   } else {
    //     console.log("❌ Registration failed, email or username missing");
    //   }
    // });

    // 🔔 On-demand login reminder trigger

    // new socket registration
    // Modified registration handler that maintains all existing functionality
   socket.on("register", (email, username, role) => {
  console.log("🔌 Registering user:", { email, username, role });

  if (email && username) {
    // Get existing data if available
    const existingData = global.userSocketMap[email] || {};
    
    // Role priority: 
    // 1. New role from registration
    // 2. Existing role from previous connection
    // 3. Default to 'user' only if completely missing
    const finalRole = role || existingData.role || 'user';
    
    // Preserve all existing data while updating
    global.userSocketMap[email] = {
      ...existingData,
      socketId: socket.id,
      username,
      role: finalRole
    };

    socketUserMap[socket.id] = email;

    console.log(`${username} (${finalRole}) connected: ${socket.id}`);
    console.log("Updated userSocketMap:", global.userSocketMap);

    if (!leaveNotifierInitialized) {
      require('../services/leaveNotificationService').init(io, global.userSocketMap);
      leaveNotifierInitialized = true;
    }
  } else {
    console.log("❌ Registration failed - email and username required");
  }
});

    socket.on("request-login-reminder", async (email) => {
      try {
        await sendLoginReminders(email); // 🔁 Use your actual reminder logic
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
        delete global.userSocketMap[email]; // ✅ Remove from global mapping
        delete socketUserMap[socket.id]; // ✅ Remove from local mapping
        console.log(`❌ Disconnected: ${email}`);
      }
    });
  });

  return { io, userSocketMap: global.userSocketMap, socketUserMap };
};

module.exports = initSocket;
