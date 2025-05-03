const express = require('express');
const router = express.Router();
const TaskCode = require('../Models/TaskCode');

// Create a new task code
router.post('/', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ message: 'Name is required' });

    const existing = await TaskCode.findOne({ name });
    if (existing) return res.status(200).json(existing);

    const taskCode = new TaskCode({ name });
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

module.exports = router;
