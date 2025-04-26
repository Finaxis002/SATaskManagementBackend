// Routes/notificationsRoutes.js
const express = require("express");
const router = express.Router();
const Notification = require("../Models/Notification");
const { io, userSocketMap } = require("../server");


router.post("/", async (req, res) => {
  try {
    const { recipientEmail, message, taskId } = req.body;

    // Validate required fields
    if (!recipientEmail || !message || !taskId) {
      console.error("Missing required fields:", { recipientEmail, message, taskId });
      return res.status(400).json({ message: "All fields (recipientEmail, message, taskId) are required" });
    }

    console.log("Received data for new notification:", req.body);

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
      console.log("Notification sent to socket:", recipientEmail);
    } else {
      console.log("Socket for user not found:", recipientEmail);
    }

    res.status(201).json({ message: "Notification sent", notification: newNotification });
  } catch (err) {
    console.error("Error saving notification:", err);
    res.status(500).json({ message: "Failed to create notification", error: err });
  }
});

// router.post("/admin", async (req, res) => {
//   try {
//     const { taskName, userName, date, message } = req.body;

//     // Validate required fields
//     if (!taskName || !userName || !date || !message) {
//       return res.status(400).json({ error: "Missing required fields" });
//     }

//     // Create and save the notification in the database
//     const notification = new Notification({
//       taskName,
//       userName,
//       date,
//       message,
//       type: "admin", // This is for admin users only
//     });

//     await notification.save();

//     // Emit the notification to all admins via socket.io
//     io.emit("admin-notification", notification);

//     res.status(201).json(notification);
//   } catch (err) {
//     console.error("Error creating notification:", err);
//     res.status(500).json({ error: err.message });
//   }
// });

// Fetch all notifications for a specific user
router.post("/admin", async (req, res) => {
  try {
    const { taskName, userName, date, recipientEmail, message, taskId } = req.body;

    // Validate required fields
    if (!taskName || !userName || !date || !recipientEmail || !message || !taskId) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Create and save the notification in the database
    const notification = new Notification({
      taskName,
      userName,
      date,
      recipientEmail,
      message,
      taskId, // Store taskId in the notification
      type: "admin", // Only admins should see this
    });

    await notification.save();

    // Emit to admin through socket.io
    const io = req.app.get('io');  // Retrieve io from the app settings
    const userSocketMap = req.app.get('userSocketMap'); // Retrieve userSocketMap

    // Ensure the io object and userSocketMap are valid
    if (!io || !userSocketMap) {
      throw new Error("Socket or userSocketMap not initialized");
    }

    io.emit("admin-notification", notification);  // Emit to all admins
    res.status(201).json(notification);
  } catch (err) {
    console.error("Error creating notification:", err);
    res.status(500).json({ error: err.message });
  }
});


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

router.get("/admin", async (req, res) => {
  try {
    console.log("Querying admin notifications...");
    // Fetch only admin notifications
    const notifications = await Notification.find({ type: 'admin' }).sort({ createdAt: -1 }).limit(20);
    console.log("Admin Notifications:", notifications);
    res.status(200).json(notifications);
  } catch (err) {
    console.error("Error fetching admin notifications:", err);
    res.status(500).json({ error: err.message });
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
