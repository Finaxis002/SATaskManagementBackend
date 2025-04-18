const { Server } = require("socket.io");

const userSocketMap = {};  // email => socket.id
const socketUserMap = {};  // socket.id => email (for reverse lookup)

const initSocket = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: [
        "http://localhost:5173", // Your local frontend URL
        "https://task-management-software-phi.vercel.app", // Production frontend URL
      ],
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    console.log("🟢 Socket connected:", socket.id);

    // Register socket with user email
    socket.on("register", (email, username) => {
      userSocketMap[email] = socket.id;   // email => socket.id
      socketUserMap[socket.id] = email;   // socket.id => email
      console.log(`${username} connected`);
    });

    // Handle sending a message to all users (broadcast)
    socket.on("sendMessage", (msg) => {
      io.emit("receiveMessage", msg); // ✅ Send to all including sender
      io.emit("inboxCountUpdated");
      console.log("📨 Broadcasting message:", msg);
    });

    // When inbox is read, reset count
    socket.on("inboxRead", () => {
      io.emit("inboxCountUpdated"); // let all clients update their badge
    });
  

    // Handle socket disconnections
    socket.on("disconnect", () => {
      const email = socketUserMap[socket.id]; // Retrieve email from socket id

      if (email) {
        delete userSocketMap[email]; // Remove email => socket mapping
        delete socketUserMap[socket.id]; // Remove socket => email mapping
        console.log(`❌ Disconnected: ${email}`);
      }
    });
  });

  return { io, userSocketMap, socketUserMap };
};

module.exports = initSocket;
