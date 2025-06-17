const express = require("express");
const router = express.Router();
const Department = require("../Models/Department");
const Employee = require("../Models/Employee");

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


router.put("/remove-department", async (req, res) => {
  const { department } = req.body;

  if (!department) {
    return res.status(400).json({ message: "Department name is required" });
  }

  try {
    // 1. Remove department from all employees (if they are part of multiple departments)
    const updatedEmployees = await Employee.updateMany(
      { departments: department },
      { $pull: { departments: department } }
    );

    // 2. Check if the department still has any users (if the department is still in use)
    const employeesInDepartment = await Employee.find({ departments: department });

    // If there are no employees left in the department, delete the department
    if (employeesInDepartment.length === 0) {
      // Here you can delete the department from your Department collection if needed
      await Department.deleteOne({ name: department });  // Delete the department itself from the Department collection
      res.json({ message: `Department "${department}" removed and deleted successfully as no users are left.` });
    } else {
      res.json({ message: `Department "${department}" removed from users, but it still has employees assigned.` });
    }

  } catch (error) {
    console.error("Error removing department", error);
    res.status(500).json({ message: "Error removing department", error });
  }
});






module.exports = router;
