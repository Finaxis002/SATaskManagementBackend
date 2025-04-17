// Routes/notificationsRoutes.js
const express = require("express");
const router = express.Router();
const Notification = require("../Models/Notification");
const { io, userSocketMap } = require("../server");


router.post("/", async (req, res) => {
  try {
    const { recipientEmail, message, taskId } = req.body;
    console.log("Received data for new notification:", req.body);

    if (!recipientEmail || !message || !taskId) {
      return res.status(400).json({ message: "All fields (recipientEmail, message, taskId) are required" });
    }

    // Save the notification to the database
    const newNotification = new Notification({
      recipientEmail,
      message,
      taskId,
    });

    await newNotification.save();

    // Check if userSocketMap contains the recipientEmail
    if (userSocketMap[recipientEmail]) {
      io.to(userSocketMap[recipientEmail]).emit("new-task", newNotification);
      console.log(`Notification sent to ${recipientEmail}`);
    } else {
      console.warn(`No socket found for ${recipientEmail}. Notification will not be sent to socket.`);
    }

    res.status(201).json({ message: "Notification sent", notification: newNotification });
  } catch (err) {
    console.error("Error saving notification:", err);
    res.status(500).json({ message: "Failed to create notification", error: err });
  }
});


module.exports = router;
