let io = null;
let userSocketMap = {};

function init(ioInstance, socketMap) {
  console.log('Initializing leave notifier...');
  io = ioInstance;
  userSocketMap = socketMap || {};
  console.log("📡 Leave Notification Service Initialized with", Object.keys(userSocketMap).length, "users");
}


function notifyAdminsOfLeaveRequest(leaveData) {
  console.log('\n=== NOTIFYING ADMINS OF LEAVE REQUEST ===');
  console.log('Current IO instance:', io ? '✅ Available' : '❌ Missing');
  console.log('Current userSocketMap:', userSocketMap);
    console.log('Current userSocketMap:', JSON.stringify(userSocketMap, null, 2));

  if (!io) {
    console.error("Socket.io instance not initialized");
    return;
  }

  if (!userSocketMap) {
    console.error("User socket map not available");
    return;
  }

  if (!leaveData?.userId) {
    console.error("Invalid leave data - missing userId");
    return;
  }

  // Find all admin sockets
 const admins = Object.entries(userSocketMap)
    .filter(([_, data]) => data.role === 'admin')
    .map(([email, data]) => ({
      email,
      socketId: data.socketId
    }));

  console.log('Found admins:', admins.map(([email]) => email));

  if (admins.length === 0) {
    console.log("⚠️ No admin users currently connected");
    return;
  }

  // Notify each admin
  // admins.forEach(([email, data]) => {
  //   try {
  //     console.log(`Notifying admin ${email} on socket ${data.socketId}`);
  //     io.to(data.socketId).emit("new-leave", {
  //       userId: leaveData.userId,
  //       leaveType: leaveData.leaveType,
  //       fromDate: leaveData.fromDate,
  //       toDate: leaveData.toDate,
  //       _id: leaveData._id,
  //       timestamp: new Date().toISOString()
  //     });
  //     console.log(`📤 Sent new-leave notification to admin: ${email}`);
  //   } catch (error) {
  //     console.error(`Error notifying admin ${email}:`, error);
  //   }
  // });

  admins.forEach(admin => {
    try {
      console.log(`📤 Sending to ${admin.email} (${admin.socketId})`);
      io.to(admin.socketId).emit("new-leave", notification);
      
      // Add this line to trigger the UI red dot
      io.to(admin.socketId).emit("leave-alert", { 
        showAlert: true,
        userId: leaveData.userId 
      });
    } catch (error) {
      console.error(`Failed to notify ${admin.email}:`, error);
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