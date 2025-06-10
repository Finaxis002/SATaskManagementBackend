let io = null;
let userSocketMap = {};

function init(ioInstance, socketMap) {
  io = ioInstance;
  userSocketMap = socketMap || {};
  console.log("📡 Leave Notification Service Initialized");
}

function notifyAdminsOfLeaveRequest(leaveData) {
  if (!io || !userSocketMap) {
    console.error("Socket.io not initialized");
    return;
  }

  if (!leaveData?.userId) {
    console.error("Invalid leave data - missing userId");
    return;
  }

  const admins = Object.entries(userSocketMap)
    .filter(([_, data]) => data.role === "admin");

  if (admins.length === 0) {
    console.log("⚠️ No admin users currently connected");
    return;
  }

  admins.forEach(([email, data]) => {
    try {
      io.to(data.socketId).emit("new-leave", {
        userId: leaveData.userId,
        leaveType: leaveData.leaveType,
        fromDate: leaveData.fromDate,
        toDate: leaveData.toDate,
        _id: leaveData._id,
        timestamp: new Date().toISOString()
      });
      console.log(`📤 Sent new-leave notification to admin: ${email}`);
    } catch (error) {
      console.error(`Error notifying admin ${email}:`, error);
    }
  });
}

function notifyUserOfLeaveStatusChange(leaveData) {
  if (!io || !userSocketMap) {
    console.error("Socket.io not initialized");
    return;
  }

  if (!leaveData?.userId) {
    console.error("Invalid leave data - missing userId");
    return;
  }

  const socketInfo = userSocketMap[leaveData.userId];
  if (socketInfo?.socketId) {
    try {
      io.to(socketInfo.socketId).emit("leave-status-updated", {
        leaveType: leaveData.leaveType,
        status: leaveData.status,
        fromDate: leaveData.fromDate,
        toDate: leaveData.toDate,
        _id: leaveData._id,
        message: leaveData.message || "",
        timestamp: new Date().toISOString()
      });
      console.log(`📤 Notified user (${leaveData.userId}) of status: ${leaveData.status}`);
    } catch (error) {
      console.error(`Error notifying user ${leaveData.userId}:`, error);
    }
  } else {
    console.log(`⚠️ User (${leaveData.userId}) is offline. Could not send update.`);
  }
}

module.exports = {
  init,
  notifyAdminsOfLeaveRequest,
  notifyUserOfLeaveStatusChange
};