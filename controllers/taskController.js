const { sendEmail } = require("../email/emailService") // Import email service
const Task = require("../models/Task"); // Assuming you're using MongoDB

const handleAddTask = async (req, res) => {
  try {
    const { newTaskName, selectedDate, assignee, currentColumnIndex } = req.body;

    // Validate the data
    if (!newTaskName || !selectedDate || !assignee) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Create task object
    const isoDueDate = new Date(selectedDate).toISOString();
    const newTask = {
      name: newTaskName,
      due: isoDueDate,
      completed: false,
      assignee,
      column: taskColumns[currentColumnIndex].title,
    };

    // Save the task to the database
    const task = await Task.create(newTask);

    // Send email to assignee
    const subject = `New Task Assigned: ${newTask.name}`;
    const text = `Hello ${assignee},\n\nYou have been assigned a new task: ${newTask.name}.\nDue Date: ${newTask.due}\n\nBest regards,\nYour Task Management System`;
    sendEmail(assignee.email, subject, text); // Assumes assignee has an 'email' field

    res.status(200).json({ message: "Task created successfully", task });
  } catch (err) {
    console.error("Failed to create task:", err);
    res.status(500).json({ message: "Failed to create task" });
  }
};
