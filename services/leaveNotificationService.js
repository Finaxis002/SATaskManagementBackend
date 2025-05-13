// services/leaveNotificationService.js

let io = null;
let userSocketMap = {};

function init(ioInstance, socketMap) {
  io = ioInstance;
  userSocketMap = socketMap;
  console.log("📡 Leave Notification Service Initialized");
}

// 🔔 Notify all admins when a user applies for leave
function notifyAdminsOfLeaveRequest(leaveData) {
  if (!io || !userSocketMap) return;

  Object.entries(userSocketMap).forEach(([email, socketId]) => {
    const role = email === "admin@example.com" || email.startsWith("admin") ? "admin" : "user"; // You can change this logic based on your role strategy

    if (role === "admin") {
      io.to(socketId).emit("new-leave", {
        userId: leaveData.userId,
        leaveType: leaveData.leaveType,
        fromDate: leaveData.fromDate,
        toDate: leaveData.toDate,
      });
      console.log(`📤 Sent new-leave notification to admin: ${email}`);
    }
  });
}

// 🔔 Notify user when their leave is approved/rejected
function notifyUserOfLeaveStatusChange(leaveData) {
  if (!io || !userSocketMap) return;

  const socketId = userSocketMap[leaveData.userId];
  if (socketId) {
    io.to(socketId).emit("leave-status-updated", {
      leaveType: leaveData.leaveType,
      status: leaveData.status,
      fromDate: leaveData.fromDate,
      toDate: leaveData.toDate,
    });
    console.log(`📤 Notified user (${leaveData.userId}) of status: ${leaveData.status}`);
  } else {
    console.log(`⚠️ User (${leaveData.userId}) is offline. Could not send update.`);
  }
}

module.exports = {
  init,
  notifyAdminsOfLeaveRequest,
  notifyUserOfLeaveStatusChange
};
