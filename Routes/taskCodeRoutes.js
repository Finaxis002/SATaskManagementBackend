const express = require('express');
const router = express.Router();
const TaskCode = require('../Models/TaskCode');

// Create a new task code
router.post('/', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ message: 'Name is required' });

    // Count existing documents
    const count = await TaskCode.countDocuments();

    // Generate prefixed name with sno
    const sno = count + 1;
    const finalName = `${sno} ${name}`;

    // Check if this exact name already exists
    const existing = await TaskCode.findOne({ name: finalName });
    if (existing) return res.status(200).json(existing);

    // Save with modified name
    const taskCode = new TaskCode({ name: finalName });
    const saved = await taskCode.save();

    res.status(201).json(saved);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


// Get all task codes
router.get('/', async (req, res) => { 
  try {
    const codes = await TaskCode.find().sort({ name: 1 });
    res.json(codes);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/task-codes/:id
router.delete("/:id", async (req, res) => {
  try {
    const deleted = await TaskCode.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: "Code not found" });
    }
    res.status(200).json({ message: "Code deleted successfully" });
  } catch (err) {
    console.error("Error deleting code:", err);
    res.status(500).json({ message: "Server error" });
  }
});


module.exports = router;
