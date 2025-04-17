const express = require("express");
const router = express.Router();
const Employee = require("../Models/Employee");
const jwt = require("jsonwebtoken")
const bcrypt = require("bcryptjs");



// Hardcoded admin credentials
const adminUserId = "admin"; // Change this as needed
const adminPassword = "admin123"; // Change this as needed

// POST /api/employees - Add new employee
router.post("/", async (req, res) => {
  const { name, email, position, department, userId, password } = req.body;

  // Validation checks (optional)
  if (!name || !email || !position || !userId || !password) {
    return res.status(400).json({ message: "All fields are required!" });
  }

  try {
    // If password hashing is needed on the server side
    const hashedPassword = await bcrypt.hash(password, 10);

    const newEmployee = new Employee({
      name,
      email,
      position,
      department,
      userId,
      password: hashedPassword, // Store hashed password
    });

    await newEmployee.save();
    res.status(201).json({ message: "Employee added successfully", employee: newEmployee });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error adding employee", error });
  }
});



router.get("/", async (req, res) => {
  try {
    const employees = await Employee.find(); // Assuming Employee is your model
    res.json(employees); // Send the employee data as a response
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch employees" });
  }
});

// DELETE Route to remove employee by ID
router.delete("/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const deletedEmployee = await Employee.findByIdAndDelete(id);

    if (!deletedEmployee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    res.status(200).json({ message: "Employee deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});



router.post("/login", async (req, res) => {
  const { userId, password } = req.body;

  // Admin Login
  if (userId === adminUserId && password === adminPassword) {
    const token = jwt.sign({ userId: adminUserId }, "your_jwt_secret", { expiresIn: "1h" });
    return res.json({
      message: "Admin login successful",
      token,
      name: "Admin",
      role: "admin",
      email: "admin@example.com" // Optional but good to include
    });
  }

  try {
    const user = await Employee.findOne({ userId });
    if (!user) {
      return res.status(400).json({ message: "Invalid userId or password" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid userId or password" });
    }

    const token = jwt.sign(
      {
        userId: user.userId,
        email: user.email,
        name: user.name,
        role: "user"
      },
      "your_jwt_secret",
      { expiresIn: "1h" }
    );

    return res.json({
      message: "Login successful",
      token,
      name: user.name,
      role: "user",
      email: user.email // ✅ SEND THIS!
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});


// In routes/employees.js
// ✅ POST: Reset password with custom value
router.post("/reset-password/:id", async (req, res) => {
  try {
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 4) {
      return res.status(400).json({ message: "Password must be at least 4 characters long" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    const updated = await Employee.findByIdAndUpdate(
      req.params.id,
      { password: hashedPassword },
      { new: true }
    );

    if (!updated) return res.status(404).json({ message: "User not found" });

    res.json({ message: "Password reset successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});



module.exports = router;
