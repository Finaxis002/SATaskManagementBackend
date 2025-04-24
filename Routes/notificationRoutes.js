// Routes/notificationsRoutes.js
const express = require("express");
const router = express.Router();
const Notification = require("../Models/Notification");
const { io, userSocketMap } = require("../server");


// ✅ Keep specific routes before dynamic ones

// Count unread notifications
router.get("/unread-count/:email", async (req, res) => {
  const email = req.params.email;
  const role = req.query.role || "user"; // passed from frontend

  try {
    let query = { read: false };

    if (role === "admin") {
      // ✅ Admin sees all unread task-updated notifications (not tied to recipient)
      query.action = "task-updated";
    } else {
      // ✅ Normal users: see their own unread 'task-created' and 'task-updated'
      query.recipientEmail = email;
      query.action = { $in: ["task-created", "task-updated"] };
    }

    const count = await Notification.countDocuments(query);

    // Optionally emit socket event (not needed here if only for fetch)
    // req.app.get("io").emit("notificationCountUpdated");

    res.json({ unreadCount: count });
  } catch (err) {
    console.error("❌ Error fetching unread count:", err);
    res.status(500).json({ unreadCount: 0 });
  }
});



router.get("/unread-count/admin", async (req, res) => {
  try {
    // Fetch all unread notifications where read: false
    const unreadNotifications = await Notification.countDocuments({
      read: false, // Only unread notifications
    });

    // Send the count as the response
    res.json({ unreadCount: unreadNotifications });
  } catch (error) {
    console.error("Error fetching unread notifications for admin:", error);
    res.status(500).json({ message: "Failed to fetch unread notifications", error });
  }
});


// Mark all as read
router.patch("/:id/mark-as-read", async (req, res) => {
  const { userId } = req.body;

  try {
    const notification = await Notification.findById(req.params.id);
    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    if (!notification.readBy) notification.readBy = [];

    if (!notification.readBy.includes(userId)) {
      notification.readBy.push(userId);
      await notification.save();
    }

    const io = req.app.get("io");
    io.emit("notificationCountUpdated");

    res.json({ success: true, updatedNotification: notification });
  } catch (err) {
    console.error("Error marking notification as read:", err);
    res.status(500).json({ message: "Failed to mark as read" });
  }
});



// PATCH /api/notifications/:id/mark-as-read
router.patch('/:id/mark-as-read', async (req, res) => {
  const { userId } = req.body;

  try {
    const notification = await Notification.findById(req.params.id);
    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    // Only push if not already marked by the user
    if (!notification.readBy.includes(userId)) {
      notification.readBy.push(userId);
      await notification.save();
    }

    // Real-time badge update (optional)
    const io = req.app.get("io");
    io.emit("notificationCountUpdated");

    res.json({ success: true, updatedNotification: notification });
  } catch (err) {
    console.error("Error marking as read:", err);
    res.status(500).json({ message: "Failed to mark as read" });
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


// For Admin - Get ALL notifications (without filtering by email)
router.get("/", async (req, res) => {
  try {
    const allNotifications = await Notification.find();
    res.status(200).json(allNotifications);
  } catch (err) {
    console.error("Error fetching all notifications:", err);
    res.status(500).json({ message: "Server error while fetching notifications" });
  }
});

// Routes/notificationsRoutes.js
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


router.patch("/:id", async (req, res) => {
  try {
    const updated = await Notification.findByIdAndUpdate(
      req.params.id,
      { read: true },
      { new: true }
    );

    // ✅ EMIT SOCKET EVENT for real-time badge update
    const io = req.app.get("io");
    io.emit("notificationCountUpdated");

    res.json(updated);
  } catch (err) {
    console.error("Error marking notification as read:", err);
    res.status(500).json({ message: "Failed to update notification" });
  }
});






module.exports = router;
