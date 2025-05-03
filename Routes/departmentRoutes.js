const express = require("express");
const router = express.Router();
const Department = require("../Models/Department");

// GET all departments
router.get("/", async (req, res) => {
  try {
    const departments = await Department.find({});
    res.json(departments);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch departments" });
  }
});

// POST new department
router.post("/", async (req, res) => {
  const { name } = req.body;

  if (!name) return res.status(400).json({ error: "Name is required" });

  try {
    const existing = await Department.findOne({ name });

    if (existing) return res.status(200).json(existing); // Avoid duplicates

    const newDept = new Department({ name });
    await newDept.save();
    res.status(201).json(newDept);
  } catch (error) {
    res.status(500).json({ error: "Failed to add department" });
  }
});

module.exports = router;
