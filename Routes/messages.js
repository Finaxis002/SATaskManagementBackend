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


// POST route to send a private message
router.post("/private-message", async (req, res) => {
  const { sender, receiver, text } = req.body;

  try {
    const newMessage = new Message({
      sender,
      receiver,
      text,
      timestamp: new Date().toLocaleTimeString(),
    });
    await newMessage.save();

    // Emit private message to the user via Socket.IO
    io.to(receiver).emit("receivePrivateMessage", newMessage); // Emit to the specific user

    res.status(200).json(newMessage);
  } catch (err) {
    res.status(500).json({ error: err.message });
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
    // 🔁 Simply count all unread messages (for everyone)
    const count = await ChatMessage.countDocuments({ read: false });
    res.json({ count });
  } catch (err) {
    console.error("❌ Failed to get unread count:", err.message);
    res.status(500).json({ message: "Failed to get unread count" });
  }
});


// PUT /api/mark-read
router.put("/mark-read", async (req, res) => {
  try {
    // 🔁 Mark all unread messages as read, for all users
    await ChatMessage.updateMany({ read: false }, { $set: { read: true } });

    res.status(200).json({ message: "All messages marked as read" });
  } catch (err) {
    console.error("❌ Error marking messages as read:", err.message);
    res.status(500).json({ message: "Failed to mark messages as read" });
  }
});




module.exports = router;
