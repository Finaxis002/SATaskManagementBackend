const ChatMessage = require("../Models/ChatMessage");
const express = require("express");
const router = express.Router();

router.post("/messages", async (req, res) => {
  try {
    const { sender, text, timestamp, recipient } = req.body;

    if (!sender || !text || !timestamp) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const newMessage = new ChatMessage({ sender, text, timestamp, recipient });
    const savedMessage = await newMessage.save();

    res.status(201).json(savedMessage);
  } catch (err) {
    console.error("❌ Error saving message:", err.message);
    res.status(500).json({ message: "Failed to save message" });
  }
});

// ✅ GET - Fetch all chat messages from MongoDB
router.get("/messages", async (req, res) => {
  try {
    const { name, role } = req.query;

    let messages = [];

    if (role === "admin") {
      messages = await ChatMessage.find().sort({ createdAt: 1 });
    } else {
      messages = await ChatMessage.find({
        $or: [
          { sender: name }, // user’s own messages
          { recipient: name }, // admin replies to them
        ],
      }).sort({ createdAt: 1 });
    }

    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: "Failed to load messages" });
  }
});

// In messages.js route
router.get("/unread-count", async (req, res) => {
  try {
    const { name, role } = req.query;

    let filter = {};

    if (role === "admin") {
      filter = { sender: { $ne: "admin" }, read: false };
    } else {
      filter = {
        recipient: { $in: [name, "all"] },
        read: false,
      };
    }

    const count = await ChatMessage.countDocuments(filter);
    res.json({ count });
  } catch (err) {
    console.error("❌ Failed to get unread count:", err.message);
    res.status(500).json({ message: "Failed to get unread count" });
  }
});



// PUT /api/mark-read
router.put("/mark-read", async (req, res) => {
  try {
    const { name, role } = req.body;

    let filter = {};

    if (role === "admin") {
      // Admin marks all unread user messages as read
      filter = { sender: { $ne: "admin" }, read: false };
    } else {
      // User marks all messages sent to them (or broadcasted) as read
      filter = { recipient: { $in: [name, "all"] }, read: false };
    }

    await ChatMessage.updateMany(filter, { $set: { read: true } });

    res.status(200).json({ message: "Messages marked as read" });
  } catch (err) {
    console.error("❌ Error marking messages as read:", err.message);
    res.status(500).json({ message: "Failed to mark messages as read" });
  }
});



module.exports = router;
