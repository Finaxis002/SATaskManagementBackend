const express = require("express");
const router = express.Router();
const Leave = require("../Models/Leave");
const leaveNotifier = require("../services/leaveNotificationService");

// POST: Apply for Leave
router.post("/", async (req, res) => {
  try {
    const leave = new Leave(req.body);
    await leave.save();

     // 🔔 Notify all admins of new leave
    leaveNotifier.notifyAdminsOfLeaveRequest(leave);
    res.status(201).json({ message: "Leave submitted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error submitting leave", error });
  }
});

// GET: All Leave Requests
router.get("/", async (req, res) => {
  try {
    const userId = req.query.userId;
    const query = userId ? { userId } : {};
    const leaves = await Leave.find(query).sort({ createdAt: -1 });
    res.status(200).json(leaves);
  } catch (error) {
    res.status(500).json({ message: "Error fetching leaves", error });
  }
});

// PUT: Update leave status
// router.put("/:id", async (req, res) => {
//   try {
//     const updated = await Leave.findByIdAndUpdate(req.params.id, {
//       status: req.body.status,
//     });
//     res.json({ message: "Status updated", updated });
//   } catch (error) {
//     res.status(500).json({ message: "Update failed", error });
//   }
// });
router.put("/:id", async (req, res) => {
  try {
    const leave = await Leave.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status },
      { new: true }
    );
    
    // 🔔 Notify user of leave approval/rejection
    leaveNotifier.notifyUserOfLeaveStatusChange(leave);

    res.json({ message: "Leave updated", leave });
  } catch (error) {
    res.status(500).json({ message: "Error updating leave", error });
  }
});

module.exports = router;
