// utils/emitNotificationCount.js
const Notification = require("../Models/Notification");

const emitUnreadNotificationCount = async (io, email) => {
  try {
    const count = await Notification.countDocuments({
      recipientEmail: email,
      read: false,
    });

    io.emit("notificationCountUpdated", {
      email,
      count,
    });

    console.log(`📢 Emitted notificationCountUpdated for ${email} with count ${count}`);
  } catch (error) {
    console.error("❌ Error emitting unread count:", error);
  }
};

module.exports = { emitUnreadNotificationCount };
