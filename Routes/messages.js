const ChatMessage = require("../Models/ChatMessage");
const express = require("express");
const router = express.Router();

// POST route to send a message (No socket logic here)
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

// GET route to fetch all messages (No socket logic here)
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

// PUT route to mark all messages as read
router.put("/mark-read", async (req, res) => {
  try {
    await ChatMessage.updateMany({ read: false }, { $set: { read: true } });
    res.status(200).json({ message: "All messages marked as read" });
  } catch (err) {
    console.error("❌ Error marking messages as read:", err.message);
    res.status(500).json({ message: "Failed to mark messages as read" });
  }
});

// POST route to save a message for a specific group (No socket logic here)
router.post("/messages/:group", async (req, res) => {
  const { group } = req.params;
  const { sender, text, timestamp } = req.body;

  console.log("Received message:", { sender, text, timestamp, group });

  if (!sender || !text || !timestamp) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  try {
    const newMessage = new ChatMessage({
      sender,
      text,
      timestamp,
      group,
    });

    const savedMessage = await newMessage.save();
    console.log("Saved message:", savedMessage);

    res.status(201).json(savedMessage);  // Respond with saved message
  } catch (err) {
    console.error("❌ Error saving message:", err);
    res.status(500).json({ message: "Failed to save message", error: err.message });
  }
});

// Enhanced API for fetching group messages with pagination and filtering
router.get("/messages/:group", async (req, res) => {
  const { group } = req.params; // Extract the group name from the URL parameters
  const { page = 1, limit = 10, read } = req.query; // Pagination with default values
  const skip = (page - 1) * limit; // Calculate how many messages to skip

  // Validate that the group is provided (since it's a URL parameter)
  if (!group) {
    return res.status(400).json({ message: "Group is required" });
  }

  // Build the query for fetching messages
  let query = { group };

  // Filter by read/unread status if provided
  if (read !== undefined) {
    query.read = read === "true"; // Convert read to a boolean value (true/false)
  }

  try {
    // Fetch the messages with pagination and optional filter (read/unread)
    const messages = await ChatMessage.find(query)
      .sort({ createdAt: -1 }) // Fetch latest messages first
      .skip(skip) // Skip the number of messages based on page
      .limit(limit); // Limit the number of messages per page

    // Fetch the total count of messages for pagination
    const totalMessages = await ChatMessage.countDocuments(query);

    // Return the messages along with pagination info
    res.json({
      messages,
      pagination: {
        totalMessages,
        currentPage: page,
        totalPages: Math.ceil(totalMessages / limit),
      },
    });
  } catch (err) {
    console.error("❌ Error loading group messages:", err.message);
    res.status(500).json({ message: "Failed to load group messages" });
  }
});

module.exports = router;
