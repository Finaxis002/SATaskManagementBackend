const ChatMessage = require("../Models/ChatMessage");
const express = require("express");
const router = express.Router();
const Employee = require("../Models/Employee");
const upload = require("../upload");
const { getSocketIdsByName } = require("../utils/socketUtils");
const { getSocketIdByName } = require("..//utils/socketUtils");
const path = require("path");

// Function to get users in a specific group
const getUsersInGroup = async (groupName) => {
  try {
    // Find all employees belonging to the given group
    const usersInGroup = await Employee.find({ department: groupName });
    return usersInGroup; // Return users found in the group
  } catch (err) {
    console.error("❌ Error fetching users in group:", err);
    return []; // Return an empty array if there's an error
  }
};

// Post route for sending messages to a group
router.post("/messages/:group", async (req, res) => {
  const { group } = req.params;
  const { sender, text, timestamp, recipient, fileUrl, fileUrls } = req.body; // Added recipient to the request body

  console.log("Received message:", {
    sender,
    text,
    timestamp,
    group,
    recipient,
  });

  if (
    !sender ||
    !timestamp ||
    (!text && !fileUrl && (!fileUrls || fileUrls.length === 0))
  ) {
    return res.status(400).json({
      message:
        "Missing required fields: sender, timestamp, and either text or at least one file",
    });
  }

  try {
    const finalFileUrls =
      Array.isArray(fileUrls) && fileUrls.length > 0
        ? fileUrls
        : fileUrl
        ? [fileUrl]
        : [];
    // Create a new message instance
    const newMessage = new ChatMessage({
      sender,
      text,
      fileUrls: finalFileUrls, // Save as array
      fileUrl: finalFileUrls.length === 1 ? finalFileUrls[0] : undefined, // Save single for backward compatibility

      timestamp,
      group,
      recipient, // Store the recipient in case of direct messages
    });

    // Save the message to the database
    const savedMessage = await newMessage.save();

    // Get the socket.io instance
    const io = req.app.get("io");

    // Emit the saved message to all connected clients (for real-time update)
    io.emit("receiveMessage", savedMessage);

    // If the message has a recipient (personal message)
    if (recipient) {
      const recipientSocket = getSocketIdByName(recipient); // Get the socket ID of the recipient
      const senderSocket = getSocketIdByName(sender); // Get the socket ID of the sender

      // Emit inbox count update to both sender and recipient
      if (recipientSocket) io.to(recipientSocket).emit("inboxCountUpdated");
      if (senderSocket) io.to(senderSocket).emit("inboxCountUpdated");
    }
    // If it's a group message
    else if (group) {
      // Get the users in the group using the getUsersInGroup function
      const groupUsers = await getUsersInGroup(group); // Get the users in the group

      // Emit inbox count update to all users in the group
      groupUsers.forEach((user) => {
        const socketIds = getSocketIdsByName(user.name);
        socketIds.forEach((socketId) =>
          io.to(socketId).emit("inboxCountUpdated")
        );
      });
    }

    // Respond with the saved message
    res.status(201).json(savedMessage);
  } catch (err) {
    console.error("❌ Error saving message:", err);
    res
      .status(500)
      .json({ message: "Failed to save message", error: err.message });
  }
});

// POST API to send a message to a user
router.post("/messages/user/:username", async (req, res) => {
  const { username } = req.params; // Get the recipient username from the URL
  const { sender, text, timestamp, recipient, fileUrl, fileUrls } = req.body; // Added recipient to the request body
  // Extract message details from the request body

  console.log("Received message:", { sender, text, timestamp, username });

  // Validate that required fields are present
  if (
    !sender ||
    !timestamp ||
    (!text && !fileUrl && (!fileUrls || fileUrls.length === 0))
  ) {
    return res.status(400).json({
      message:
        "Missing required fields: sender, timestamp, and either text or at least one file",
    });
  }

  const finalFileUrls =
    Array.isArray(fileUrls) && fileUrls.length > 0
      ? fileUrls
      : fileUrl
      ? [fileUrl]
      : [];

  try {
    // Create a new message object and save it to the database
    const newMessage = new ChatMessage({
      sender,
      fileUrls: finalFileUrls,
      fileUrl: finalFileUrls.length === 1 ? finalFileUrls[0] : undefined,
      text,
      timestamp,
      recipient: username, // Store the recipient username
    });

    const savedMessage = await newMessage.save();
    const io = req.app.get("io");
    io.emit("receiveMessage", savedMessage);
    io.emit("inboxCountUpdated");

    res.status(201).json(savedMessage); // Respond with the saved message
  } catch (err) {
    console.error("❌ Error saving message:", err);
    res
      .status(500)
      .json({ message: "Failed to save message", error: err.message });
  }
});

// Define the API endpoint to upload files
router.post("/upload", upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).send({ message: "No file uploaded" });
  }

  // The file was uploaded successfully
  const fileUrl = `/uploads/${req.file.filename}`; // Construct the URL to access the file

  // Send back the file URL as response
  res.status(200).send({ fileUrl });
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

// router.put("/mark-read", async (req, res) => {
//   try {
//     await ChatMessage.updateMany({ read: false }, { $set: { read: true } });

//     // 🛠️ After updating, broadcast to all connected clients
//     const io = req.app.get("io"); // make sure your socket.io instance is attached
//     io.emit("inboxCountUpdated"); // ✅ Tell frontend to refresh badges

//     res.status(200).json({ message: "All messages marked as read" });
//   } catch (err) {
//     console.error("❌ Error marking messages as read:", err.message);
//     res.status(500).json({ message: "Failed to mark messages as read" });
//   }
// });

router.put("/mark-read", async (req, res) => {
  const { messageIds, userId } = req.body;
  if (!Array.isArray(messageIds) || !userId) return res.sendStatus(400);

  await ChatMessage.updateMany(
    { _id: { $in: messageIds }, readBy: { $ne: userId } },
    { $addToSet: { readBy: userId } }
  );

  req.app.get("io").emit("inboxCountUpdated", { userId });
  res.status(200).json({ message: "Selected messages marked as read." });
});

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

    console.log(
      `✅ Marked ${result.modifiedCount} messages as read in group ${group}`
    );

    // 🔁 Emit socket event to update sidebar badges
    req.app.get("io").emit("inboxCountUpdated");

    return res.json({ success: true, updated: result.modifiedCount });
  } catch (error) {
    console.error("❌ Error marking group messages as read:", error.message);
    return res
      .status(500)
      .json({ message: "Failed to mark group messages as read" });
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
// ========== [Replace your /unread-count endpoint logic with below] ==========
// router.get("/unread-count", async (req, res) => {
//   const { name, role } = req.query;

//   try {
//     let count = 0;

//     // Direct unread messages (use readBy!)
//     const directUnread = await ChatMessage.countDocuments({
//       recipient: name,
//       readBy: { $ne: name },
//       sender: { $ne: name },
//       $or: [{ group: { $exists: false } }, { group: "" }],
//     });

//     count += directUnread;

//     // Group unread (use readBy!)
//     if (role === "admin" || role === "user") {
//       const user = await Employee.findOne({ name });
//       const userGroups = user?.department || [];

//       const groupUnread = await ChatMessage.countDocuments({
//         group: { $in: userGroups },
//         $or: [{ readBy: { $exists: false } }, { readBy: { $ne: name } }],
//         sender: { $ne: name },
//       });

//       count += groupUnread;
//     }

//     res.json({ unreadCount: count });
//   } catch (err) {
//     console.error("❌ Failed fetching unread count:", err);
//     res.status(500).json({ message: "Server error" });
//   }
// });


router.get("/unread-count", async (req, res) => {
  const { name, role } = req.query;
  try {
    let count = 0;
    const directUnread = await ChatMessage.countDocuments({
      recipient: name,
      readBy: { $ne: name },
      sender: { $ne: name },
      $or: [{ group: { $exists: false } }, { group: "" }],
    });
    count += directUnread;

    let user = await Employee.findOne({ name });
    let userGroups = user?.department || [];

    // Special fix for main admin
    if ((!user || userGroups.length === 0) && name === "admin" && role === "admin") {
      userGroups = [
        "Marketing", "Operations", "IT/Software", "SEO", "Human Resource", "Finance", "Administration"
      ];
    }

    if (role === "admin" || role === "user") {
      const groupUnread = await ChatMessage.countDocuments({
        group: { $in: userGroups },
        $or: [{ readBy: { $exists: false } }, { readBy: { $ne: name } }],
        sender: { $ne: name },
      });
      count += groupUnread;
    }
    res.json({ unreadCount: count });
  } catch (err) {
    console.error("❌ Failed fetching unread count:", err);
    res.status(500).json({ message: "Server error" });
  }
});


// Updated /group-unread-counts endpoint
// router.get("/group-unread-counts", async (req, res) => {
//   const { name } = req.query;
//   const { userId, groups } = req.query; // groups: array of group IDs/names

//   try {
//     // Get user's groups first
//     const user = await Employee.findOne({ name });
//     const userGroups = user?.department || [];

//     // Aggregate counts only for user's groups
//     const results = await ChatMessage.aggregate([
//       {
//         $match: {
//           group: { $in: groups },
//           readBy: { $ne: userId },
//           sender: { $ne: userId },
//         },
//       },
//       {
//         $group: {
//           _id: "$group",
//           count: { $sum: 1 },
//         },
//       },
//     ]);

//     const counts = {};
//     results.forEach((item) => {
//       counts[item._id] = item.count;
//     });

//     res.json({ groupUnreadCounts: counts });
//   } catch (err) {
//     res.status(500).json({ message: "Server error" });
//   }
// });

// ========== [Replace your /group-unread-counts endpoint logic with below] ==========
router.get("/group-unread-counts", async (req, res) => {
  const { name } = req.query;
  try {
    const user = await Employee.findOne({ name });
    let userGroups = user?.department || [];
    if ((!user || userGroups.length === 0) && name === "admin") {
      userGroups = [
        "Marketing", "Operations", "IT/Software", "SEO",
        "Human Resource", "Finance", "Administration"
      ];
    }

    // Aggregate counts only for user's groups, use readBy!
    const results = await ChatMessage.aggregate([
      {
        $match: {
          group: { $in: userGroups },
          readBy: { $ne: name },
          sender: { $ne: name },
        },
      },
      {
        $group: {
          _id: "$group",
          count: { $sum: 1 },
        },
      },
    ]);
    const counts = {};
    results.forEach((item) => {
      counts[item._id] = item.count;
    });

    res.json({ groupUnreadCounts: counts });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// Updated /user-unread-counts endpoint
// router.get("/user-unread-counts", async (req, res) => {
//   const { name } = req.query;

//   try {
//     const results = await ChatMessage.aggregate([
//       {
//         $match: {
//           recipient: name, // Only messages sent to this user
//           read: false,
//           sender: { $ne: name }, // Not their own messages
//           group: { $exists: false }, // Only direct messages
//         },
//       },
//       {
//         $group: {
//           _id: "$sender",
//           count: { $sum: 1 },
//         },
//       },
//     ]);

//     const counts = {};
//     results.forEach((item) => {
//       counts[item._id] = item.count;
//     });

//     res.json({ userUnreadCounts: counts });
//   } catch (err) {
//     res.status(500).json({ message: "Server error" });
//   }
// });

// ========== [Replace your /user-unread-counts endpoint logic with below] ==========
router.get("/user-unread-counts", async (req, res) => {
  const { name } = req.query;

  try {
    const results = await ChatMessage.aggregate([
      {
        $match: {
          recipient: name,
          readBy: { $ne: name },
          sender: { $ne: name },
          $or: [{ group: { $exists: false } }, { group: "" }],
        },
      },
      {
        $group: {
          _id: "$sender",
          count: { $sum: 1 },
        },
      },
    ]);

    const counts = {};
    results.forEach((item) => {
      counts[item._id] = item.count;
    });

    res.json({ userUnreadCounts: counts });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// Serve the uploaded files statically
router.use("/uploads", express.static(path.join(__dirname, "uploads")));

module.exports = router;
