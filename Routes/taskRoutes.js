const express = require("express");
const router = express.Router();
const { sendEmail } = require("../email/emailService");  // Import email service
const Task = require("../Models/Task");
const { io, userSocketMap } = require("../server");






// Task Route
// router.post("/", async (req, res) => {
//   try {
//     console.log("Received Task Body:", req.body);

//     const task = new Task(req.body);
//     const savedTask = await task.save();
    
//     console.log("Saved Task:", savedTask);  // Log the saved task to ensure data is correct

//     // Access socket.io and userSocketMap from app
//     const io = req.app.get("io");
//     const userSocketMap = req.app.get("userSocketMap");

//     const userEmail = savedTask?.assignee?.email;

//     console.log("Assigned User Email:", userEmail);  // Check if we have the correct assignee email

//     if (userEmail && userSocketMap[userEmail]) {
//       console.log(`Sending task to user: ${userEmail}`);  // Log before emitting
//       io.to(userSocketMap[userEmail]).emit("new-task", savedTask);  // Emit task to assigned user
//       console.log(`📨 Sent task "${savedTask.name}" to ${userEmail}`);
//     } else {
//       console.log("No socket found for the user or email not assigned");
//     }

//     res.status(201).json({ message: "Task created", task: savedTask });
//   } catch (error) {
//     console.error("Error saving task:", error);
//     res.status(500).json({ message: "Failed to create task", error });
//   }
// });

// // Task creation API with email notification
// router.post("/send-email", async (req, res) => {
//   const { to, subject, text } = req.body; // Get email parameters from request body

//   if (!to || !subject || !text) {
//     return res.status(400).json({ success: false, message: "Missing required fields" });
//   }

//   const result = await sendEmail(to, subject, text); // Send the email

//   if (result.success) {
//     return res.status(200).json({ success: true, message: "Email sent successfully" });
//   } else {
//     return res.status(500).json(result);
//   }
// });



// Task creation API
// Task Route
router.post("/", async (req, res) => {
  try {
    console.log("Received Task Body:", req.body);

    const task = new Task(req.body);
    const savedTask = await task.save();

    console.log("Saved Task:", savedTask);  // Log the saved task to ensure data is correct

    // Access socket.io and userSocketMap from app
    const io = req.app.get("io");
    const userSocketMap = req.app.get("userSocketMap");

    const userEmail = savedTask?.assignee?.email;

    console.log("Assigned User Email:", userEmail);  // Check if we have the correct assignee email

    // Send email to assignee
    if (userEmail) {
      const subject = `New Task Assigned: ${savedTask.name}`;
      const text = `Hello ${savedTask.assignee.name},\n\nYou have been assigned a new task: ${savedTask.name}.\nDue Date: ${savedTask.due}\n\nBest regards,\nYour Task Management System`;
      await sendEmail(userEmail, subject, text); // Send email to the assigned user

      console.log(`📨 Email sent to: ${userEmail}`);
    } else {
      console.log("No email found for the assignee");
    }

    // Emit task to assigned user if socket exists
    if (userEmail && userSocketMap[userEmail]) {
      console.log(`Sending task to user: ${userEmail}`);  // Log before emitting
      io.to(userSocketMap[userEmail]).emit("new-task", savedTask);  // Emit task to assigned user
      console.log(`📨 Sent task "${savedTask.name}" to ${userEmail}`);
    } else {
      console.log("No socket found for the user or email not assigned");
    }

    res.status(201).json({ message: "Task created", task: savedTask });
  } catch (error) {
    console.error("Error saving task:", error);
    res.status(500).json({ message: "Failed to create task", error });
  }
});


// Get all tasks
router.get("/", async (req, res) => {
  try {
    const tasks = await Task.find();
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch tasks", error });
  }
});

//complete flag API
// router.patch('/:id', async (req, res) => {
//   const { id } = req.params;
//   const { name, due, assignee, completed } = req.body;

//   try {
//       // Update the task with all necessary fields
//       const updatedTask = await Task.findByIdAndUpdate(
//           id,
//           { name, due, assignee, completed },
//           { new: true } // return the updated document
//       );

//       if (!updatedTask) {
//           return res.status(404).json({ message: "Task not found" });
//       }

//       // Emit the updated task to all connected clients
//       const io = req.app.get("io");
//       io.emit("task-updated", updatedTask); // Emit task update event

//       res.json(updatedTask);
//   } catch (error) {
//       console.error("Failed to update task", error);
//       res.status(500).json({ message: "Server error while updating task" });
//   }
// });

// Complete flag API to update task completion and send email
router.patch('/:id', async (req, res) => {
  const { id } = req.params;
  const { name, due, assignee, completed } = req.body;

  try {
      // Update the task with all necessary fields
      const updatedTask = await Task.findByIdAndUpdate(
          id,
          { name, due, assignee, completed },
          { new: true } // return the updated document
      );

      if (!updatedTask) {
          return res.status(404).json({ message: "Task not found" });
      }

      // Emit the updated task to all connected clients
      const io = req.app.get("io");
      io.emit("task-updated", updatedTask); // Emit task update event

      // Send email to the assignee regarding the task update
      if (updatedTask.assignee && updatedTask.assignee.email) {
          const subject = `Task Updated: ${updatedTask.name}`;
          const text = `
              Hello ${updatedTask.assignee.name},\n\n
              Your task has been updated:\n
              Task: ${updatedTask.name}\n
              Due Date: ${updatedTask.due}\n
              Status: ${completed ? "Completed" : "Not Completed"}\n\n
              Best regards,\n
              Task Management System
          `;
          await sendEmail(updatedTask.assignee.email, subject, text);  // Send email to the assignee
          console.log(`📨 Email sent to: ${updatedTask.assignee.email}`);
      } else {
          console.log("No email found for the assignee");
      }

      res.json(updatedTask);
  } catch (error) {
      console.error("Failed to update task", error);
      res.status(500).json({ message: "Server error while updating task" });
  }
});

  
// Delete a task (optional)
router.delete("/:id", async (req, res) => {
  try {
    await Task.findByIdAndDelete(req.params.id);
    res.json({ message: "Task deleted" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete task", error });

  }
});



module.exports = router;