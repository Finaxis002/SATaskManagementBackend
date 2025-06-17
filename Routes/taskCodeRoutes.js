const express = require('express');
const router = express.Router();
const TaskCode = require('../Models/TaskCode');
const Task = require('../Models/Task');
const verifyToken = require("../middleware/verifyToken");
const checkHeaders = require("../middleware/checkHeaders");

router.use(checkHeaders);
router.use(verifyToken);
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
// router.delete("/:id", async (req, res) => {
//   try {
//     const deleted = await TaskCode.findByIdAndDelete(req.params.id);
//     if (!deleted) {
//       return res.status(404).json({ message: "Code not found" });
//     }
//     res.status(200).json({ message: "Code deleted successfully" });
//   } catch (err) {
//     console.error("Error deleting code:", err);
//     res.status(500).json({ message: "Server error" });
//   }
// });

// DELETE /api/task-codes/:id
router.delete('/:id', async (req, res) => {
  try {
    // Step 1: Find and delete the code
    const deletedCode = await TaskCode.findByIdAndDelete(req.params.id);
    if (!deletedCode) return res.status(404).send("Task code not found");

    // Step 2: Remove the code from tasks using it
    await Task.updateMany(
      { code: deletedCode.name },
      { $unset: { code: "" } } // Or: { $set: { code: "Unassigned" } }
    );

    res.status(200).json({ message: "Code deleted and removed from tasks." });
  } catch (err) {
    console.error("Error deleting code:", err);
    res.status(500).json({ error: "Server error" });
  }
});


// UPDATE /api/task-codes/:id - Edit task code name
// router.put('/:id', async (req, res) => {
//   try {
//     const { name } = req.body;

//     if (!name) {
//       return res.status(400).json({ message: 'Name is required to update' });
//     }

//     // Find the task code by ID
//     const taskCode = await TaskCode.findById(req.params.id);
//     if (!taskCode) {
//       return res.status(404).json({ message: 'Task code not found' });
//     }

//     // Extract serial number from existing name, if it exists
//     const existingParts = taskCode.name.split(' ');
//     const serialNumber = existingParts.length > 1 && !isNaN(existingParts[0]) ? existingParts[0] : '';

//     // Update the name (preserve serial number if it exists)
//     taskCode.name = serialNumber ? `${serialNumber} ${name}` : name;

//     const updated = await taskCode.save();
//     res.status(200).json(updated);
//   } catch (err) {
//     console.error("Error updating task code:", err);
//     res.status(500).json({ message: 'Server error' });
//   }
// });
// UPDATE /api/task-codes/:id - Edit task code name
router.put('/:id', async (req, res) => {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Name is required to update' });
    }

    // Step 1: Find the task code by ID
    const taskCode = await TaskCode.findById(req.params.id);
    if (!taskCode) {
      return res.status(404).json({ message: 'Task code not found' });
    }

    // Step 2: Extract serial number from existing name
    const existingParts = taskCode.name.split(' ');
    const serialNumber =
      existingParts.length > 1 && !isNaN(existingParts[0]) ? existingParts[0] : '';

    // Step 3: Construct new name
    const oldName = taskCode.name; // Save old name for updating tasks
    const newName = serialNumber ? `${serialNumber} ${name}` : name;

    // Step 4: Update task code document
    taskCode.name = newName;
    const updated = await taskCode.save();

    // ✅ Step 5: Update all tasks that had the old code name
    await Task.updateMany(
      { code: oldName },
      { $set: { code: newName } }
    );

    res.status(200).json(updated);
  } catch (err) {
    console.error("Error updating task code:", err);
    res.status(500).json({ message: 'Server error' });
  }
});



module.exports = router;
