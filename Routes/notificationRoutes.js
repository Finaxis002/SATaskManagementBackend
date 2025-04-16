// Routes/notificationsRoutes.js
const express = require("express");
const router = express.Router();
const Notification = require("../Models/Notification");
const { io, userSocketMap } = require("../server");

// Create a new notification (Triggered when a task is assigned)
router.post("/", async (req, res) => {
  try {
    const { recipientEmail, message, taskId } = req.body;

    // Save the notification to the database
    const newNotification = new Notification({
      recipientEmail,
      message,
      taskId,
    });

    await newNotification.save();

    // Emit to the user via socket.io
    if (userSocketMap[recipientEmail]) {
      io.to(userSocketMap[recipientEmail]).emit("new-task", newNotification);
    }

    res.status(201).json({ message: "Notification sent", notification: newNotification });
  } catch (err) {
    console.error("Error saving notification:", err);
    res.status(500).json({ message: "Failed to create notification", error: err });
  }
});

// Fetch all notifications for a specific user
router.get("/:email", async (req, res) => {
  try {
    const { email } = req.params;
    const notifications = await Notification.find({ recipientEmail: email })
      .sort({ createdAt: -1 }) // Newest first
      .exec();

    res.status(200).json(notifications);
  } catch (err) {
    console.error("Error fetching notifications:", err);
    res.status(500).json({ message: "Failed to fetch notifications", error: err });
  }
});

// Mark notification as read
router.patch("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const updatedNotification = await Notification.findByIdAndUpdate(
      id,
      { read: true },
      { new: true } // Return the updated document
    );

    if (!updatedNotification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    res.status(200).json(updatedNotification);
  } catch (err) {
    console.error("Error updating notification:", err);
    res.status(500).json({ message: "Failed to mark notification as read", error: err });
  }
});

// Clear all notifications for a user (optional)
router.delete("/:email", async (req, res) => {
  try {
    const { email } = req.params;
    await Notification.deleteMany({ recipientEmail: email });
    res.status(200).json({ message: "All notifications cleared" });
  } catch (err) {
    console.error("Error clearing notifications:", err);
    res.status(500).json({ message: "Failed to clear notifications", error: err });
  }
});

module.exports = router;
