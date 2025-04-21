const ChatMessage = require("../Models/ChatMessage");
const express = require("express");
const router = express.Router();
const Employee = require("../Models/Employee");

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

// ✅ GET unread message count for a user
router.get("/unread-count", async (req, res) => {
  const { name, role } = req.query;

  if (!name || !role) {
    return res.status(400).json({ message: "Name and role are required" });
  }

  try {
    // Filter unread messages not sent by the current user
    const unreadMessages = await ChatMessage.find({
      read: false,
      sender: { $ne: name }, // Don't count messages sent by the user themselves
    });

    res.json({ unreadCount: unreadMessages.length });
  } catch (err) {
    console.error("❌ Error fetching unread count:", err.message);
    res.status(500).json({ message: "Failed to fetch unread count" });
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

router.get("/group-unread-counts", async (req, res) => {
  const { name } = req.query;

  if (!name) return res.status(400).json({ message: "Name is required" });

  try {
    const unreadMessages = await ChatMessage.find({
      read: false,
      sender: { $ne: name },
    });

    const counts = {};
    unreadMessages.forEach((msg) => {
      counts[msg.group] = (counts[msg.group] || 0) + 1;
    });

    res.json({ groupUnreadCounts: counts });
  } catch (error) {
    console.error("❌ Error fetching group counts:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// PUT /api/mark-read-group
router.put("/mark-read-group", async (req, res) => {
  const { name, group } = req.body;

  if (!name || !group) {
    return res.status(400).json({ message: "Name and group are required" });
  }

  try {
    const result = await ChatMessage.updateMany(
      {
        group,
        read: false,
        sender: { $ne: name },
      },
      { $set: { read: true } }
    );

    console.log(`✅ Marked ${result.modifiedCount} messages as read in group ${group}`);

    // 🔁 Emit socket event to update sidebar badges
    req.app.get("io").emit("inboxCountUpdated");

    return res.json({ success: true, updated: result.modifiedCount });
  } catch (error) {
    console.error("❌ Error marking group messages as read:", error.message);
    return res.status(500).json({ message: "Failed to mark group messages as read" });
  }
});

router.get("/group-members/:group", async (req, res) => {
  const { group } = req.params;

  try {
    const usersInGroup = await Employee.find({ department: group });
    res.json({ members: usersInGroup });
  } catch (err) {
    console.error("❌ Error fetching group members:", err.message);
    res.status(500).json({ message: "Server error" });
  }
});


// POST API to send a message to a user
router.post("/messages/user/:username", async (req, res) => {
  const { username } = req.params;  // Get the recipient username from the URL
  const { sender, text, timestamp } = req.body;  // Extract message details from the request body

  console.log("Received message:", { sender, text, timestamp, username });

  // Validate that required fields are present
  if (!sender || !text || !timestamp) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  try {
    // Create a new message object and save it to the database
    const newMessage = new ChatMessage({
      sender,
      text,
      timestamp,
      recipient: username,  // Store the recipient username
    });

    const savedMessage = await newMessage.save();  // Save message to the database
    console.log("Saved message:", savedMessage);

    res.status(201).json(savedMessage);  // Respond with the saved message
  } catch (err) {
    console.error("❌ Error saving message:", err);
    res.status(500).json({ message: "Failed to save message", error: err.message });
  }
});


router.get("/messages/user/:username", async (req, res) => {
  const { username } = req.params;

  try {
    // Find messages where either sender or recipient is the username
    const messages = await ChatMessage.find({
      $or: [{ sender: username }, { recipient: username }],
    }).sort({ timestamp: -1 }); // Sort messages by timestamp in descending order

    res.json({ messages });
  } catch (err) {
    console.error("❌ Error fetching user-to-user messages:", err.message);
    res.status(500).send("Server Error");
  }
});



// ✅ NEW ROUTE to fetch all group members
router.get("/group-members", async (req, res) => {
  try {
    const allEmployees = await Employee.find({}, "name department");
    const grouped = {};

    allEmployees.forEach((emp) => {
      if (!grouped[emp.department]) {
        grouped[emp.department] = [];
      }
      grouped[emp.department].push(emp.name);
    });

    res.json({ groupMembers: grouped });
  } catch (err) {
    console.error("Error fetching group members:", err);
    res.status(500).json({ message: "Server error" });
  }
});


module.exports = router;
