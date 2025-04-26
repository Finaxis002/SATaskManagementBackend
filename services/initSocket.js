// initSocket.js
const { Server } = require('socket.io');
const userSocketMap = {};  // Store user email => socket id mapping

function init(io) {
  io.on('connection', (socket) => {
    console.log('🟢 Socket connected:', socket.id);

    // Register socket for a specific user (based on email)
    socket.on('register', (email) => {
      userSocketMap[email] = socket.id;  // Store email and socket id mapping
      console.log(`${email} connected with socket ID: ${socket.id}`);
    });

    // Handle socket disconnection
    socket.on('disconnect', () => {
      // Remove user from the map when disconnected
      const email = Object.keys(userSocketMap).find(key => userSocketMap[key] === socket.id);
      if (email) {
        delete userSocketMap[email];
        console.log(`❌ Disconnected: ${email}`);
      }
    });
  });
}

module.exports = { init, userSocketMap };
