const { Server } = require("socket.io");
const ChatMessage = require("../Models/ChatMessage");

const userSocketMap = {}; // email => socket.id

const initSocket = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: [
        "http://localhost:5173",
        "https://task-management-software-phi.vercel.app",
      ],
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    console.log("🟢 Socket connected:", socket.id);

    // Register user
    socket.on("register", (email) => {
      userSocketMap[email] = socket.id;
      console.log(`📌 Registered ${email} with socket ${socket.id}`);
    });

    // Save and broadcast new message
    socket.on("sendMessage", async (msg) => {
      try {
        if (msg.sender.toLowerCase() === "admin" && !msg.recipient) {
          msg.recipient = "all";
        }

        const saved = await new ChatMessage({ ...msg, read: false }).save();
        io.emit("receiveMessage", saved); // 🔴 notify all clients
      } catch (err) {
        console.error("❌ Error saving message:", err.message);
      }
    });

    // Broadcast inboxRead event
    socket.on("inboxRead", (data) => {
      console.log("📨 inboxRead event:", data);
      io.emit("inboxRead", data); // ✅ notify all clients to reset
    });

    // Handle disconnect
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
