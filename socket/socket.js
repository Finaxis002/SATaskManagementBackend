const { Server } = require("socket.io");
const ChatMessage = require("../Models/ChatMessage");

const userSocketMap = {}; // email => socket.id

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

    socket.on("register", (email) => {
      userSocketMap[email] = socket.id;
      console.log(`📌 Registered ${email} with socket ${socket.id}`);
    });

    socket.on("sendMessage", (msg) => {
      io.emit("receiveMessage", msg); // ✅ Send to all including sender
      io.emit("inboxCountUpdated");
      console.log("📨 Broadcasting message:", msg);
    });

    // ✅ When inbox is read, reset count
    socket.on("inboxRead", () => {
      io.emit("inboxCountUpdated"); // let all clients update their badge
    });

    socket.on("disconnect", () => {
      const email = Object.keys(userSocketMap).find(
        (key) => userSocketMap[key] === socket.id
      );
      if (email) {
        delete userSocketMap[email];
        console.log(`❌ Disconnected: ${email}`);
      }
    });
  });

  return { io, userSocketMap };
};

module.exports = initSocket;
