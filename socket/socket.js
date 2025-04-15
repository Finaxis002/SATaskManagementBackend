const { Server } = require("socket.io");

const userSocketMap = {}; // email => socket.id

const initSocket = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: "http://localhost:5173", // ✅ NO trailing slash
      methods: ["GET", "POST"],
      credentials: true,               // ✅ Optional but helpful
    },
  });

  io.on("connection", (socket) => {
    console.log("🟢 Socket connected:", socket.id);

    socket.on("register", (email) => {
      userSocketMap[email] = socket.id;
      console.log(`📌 Registered ${email} with socket ${socket.id}`);
    });

    socket.on("disconnect", () => {
      const userEmail = Object.keys(userSocketMap).find(
        (key) => userSocketMap[key] === socket.id
      );
      if (userEmail) {
        delete userSocketMap[userEmail];
        console.log(`❌ Removed ${userEmail} on disconnect`);
      }
    });
  });

  return { io, userSocketMap };
};

module.exports = initSocket;
