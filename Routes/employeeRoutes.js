const express = require("express");
const router = express.Router();
const Employee = require("../Models/Employee");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
  
  const { sendLoginReminders } = require("../services/taskReminderService");

// Hardcoded admin credentials
const adminUserId = "admin"; // Change this as needed
const adminPassword = "admin123"; // Change this as needed


router.post("/", async (req, res) => {
  const { name, email, position, department, userId, password, role } = req.body;

  // Validation checks (optional)
  if (!name || !email || !position || !userId || !password) {
    return res.status(400).json({ message: "All fields are required!" });
  }

  try {
    // Check if email already exists
    const existingEmployee = await Employee.findOne({ email });
    if (existingEmployee) {
      return res.status(400).json({ message: "Email already exists!" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Default role to 'user' if not provided
    const newEmployeeRole = role || 'user'; // Default to 'user' role if not provided

    const newEmployee = new Employee({
      name,
      email,
      position,
      department,
      userId,
      password: hashedPassword, // Store hashed password
      role: newEmployeeRole, // Set role (defaults to 'user' if not 'admin')
    });

    await newEmployee.save();
    res.status(201).json({ message: "Employee added successfully", employee: newEmployee });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error adding employee", error });
  }
});


// GET /api/employees - Get all employees
router.get("/", async (req, res) => {
  try {
    const employees = await Employee.find(); 
    res.json(employees);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch employees" });
  }
});

// PUT /api/employees/:id - Update employee details (including role)
router.put("/:id", async (req, res) => {
  const { name, email, position, department, userId, role } = req.body;

  // Validate input
  if (!name || !email || !position || !userId || !role) {
    return res.status(400).json({ message: "All fields are required!" });
  }

  // Check if email is in the right format
  const emailRegex = /^[\w-\.]+@([\w-]+\.)+[a-zA-Z]{2,7}$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ message: "Invalid email format." });
  }

  try {
    // Find the employee by ID
    const employee = await Employee.findById(req.params.id);
    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    // Update employee details
    employee.name = name;
    employee.email = email;
    employee.position = position;
    employee.department = department;
    employee.userId = userId;
    employee.role = role || employee.role;  // Update role if provided

    // Save the updated employee to the database
    const updatedEmployee = await employee.save();
    
    res.json({
      message: "Employee updated successfully",
      employee: updatedEmployee
    });
  } catch (err) {
    console.error("Error updating employee:", err);
    res.status(500).json({ message: "Error updating employee", error: err.message });
  }
});


// DELETE /api/employees/:id - Delete employee
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

// POST /api/employees/login - Login route for both Admin and Employees
router.post("/login", async (req, res) => {
  const { userId, password } = req.body;

  // Admin Login
  if (userId === adminUserId && password === adminPassword) {
    const token = jwt.sign({ userId: adminUserId, role: "admin" }, "your_jwt_secret", { expiresIn: "1h" });
    return res.json({
      message: "Admin login successful",
      token,
      name: "Admin",
      role: "admin",
      email: "admin@example.com",
      department: "Administrator" // ✅ optional, for consistency
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
        role: user.role || "user"
      },
      "your_jwt_secret",
      { expiresIn: "1h" }
    );

      // ✅ Fixed: Fire-and-forget with proper error handling
    (async () => {
      try {
        console.log(`Starting reminders for ${user.email}`);
        await sendLoginReminders(user.email);
        console.log(`Reminders completed for ${user.email}`);
      } catch (err) {
        console.error("Reminder error:", err);
      }
    })();

    return res.json({
      message: "Login successful",
      token,
      name: user.name,
      role: user.role || "user",
      email: user.email,
      department: user.department // ✅ Added here
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});


// POST /api/employees/reset-password/:id - Reset password
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
