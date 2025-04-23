// Routes/notificationsRoutes.js
const express = require("express");
const router = express.Router();
const Notification = require("../Models/Notification");
const { io, userSocketMap } = require("../server");


// ✅ Keep specific routes before dynamic ones

// Count unread notifications
router.get("/unread-count/:email", async (req, res) => {
  const email = req.params.email;
  const role = req.query.role || "user"; // add ?role=user or ?role=admin in frontend

  try {
    const query = {
      recipientEmail: email,
      read: false,
    };

    // If the user is an admin, we will only count 'task-updated' notifications
    if (role === "admin") {
      query.action = "task-updated"; // Admin sees only 'task-updated' notifications
    } else {
      query.recipientEmail = email; // For users, we filter by their email
      query.type = "user"; // User notifications
    }

    const count = await Notification.countDocuments(query);

    res.json({ unreadCount: count });
  } catch (err) {
    console.error("Error fetching unread count:", err);
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
router.patch("/mark-all-read/:email", async (req, res) => {
  try {
    const email = req.params.email;

    const result = await Notification.updateMany(
      { recipientEmail: email, read: false },
      { $set: { read: true } }
    );

    res.json({ success: true, modifiedCount: result.modifiedCount });
  } catch (err) {
    console.error("Error marking all as read:", err);
    res.status(500).json({ success: false });
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
    const notificationId = req.params.id;

    const updated = await Notification.findByIdAndUpdate(
      notificationId,
      { $set: { read: true } },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ message: "Notification not found" });
    }

    res.json({ success: true, updated });
  } catch (err) {
    console.error("Error marking notification as read:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});





module.exports = router;
