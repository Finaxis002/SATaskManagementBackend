const express = require("express");
const router = express.Router();
const Task = require("../Models/Task");

// Create a new task
router.post("/assign-task", async (req, res) => {
  const { name, due, completed, assignedTo, assignedToName, column } = req.body;

  if (!name || !due) {
    return res.status(400).json({ message: "Task name and due date are required" });
  }

  try {
    const task = new Task({
      name,
      due,
      completed: completed || false,
      assignedTo,
      assignedToName,
      column,
    });

    const savedTask = await task.save();
    res.status(201).json({ message: "Task created", task: savedTask });
  } catch (error) {
    console.error("Error creating task:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Optional: Get all tasks
router.get("/", async (req, res) => {
  try {
    const tasks = await Task.find().populate("assignedTo", "name email");
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch tasks" });
  }
});

router.post("/create", async (req, res) => {
  const { name, due, completed, assignedTo, assignedToName, column } = req.body;

  try {
    const task = new Task({
      name,
      due,
      completed: completed || false,
      assignedTo,
      assignedToName,
      column,
    });

    const saved = await task.save();
    res.status(201).json({ message: "Task saved", task: saved });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to save task" });
  }
});

module.exports = router;
