const express = require("express");
const router = express.Router();
const { sendEmail } = require("../email/emailService"); // Import email service
const Task = require("../Models/Task");
const axios = require("axios");
const Notification = require("../Models/Notification");

// Task creation API
// Task Route
// router.post("/", async (req, res) => {
//   try {
//     // console.log("Received Task Body:", req.body);

//     const task = new Task(req.body);
//     const savedTask = await task.save();

//     // console.log("Saved Task:", savedTask);

//     // Access socket.io and userSocketMap from app
//     const io = req.app.get("io");
//     const userSocketMap = req.app.get("userSocketMap");

//     // Notify each assignee
//     if (Array.isArray(savedTask.assignees)) {
//       for (const assignee of savedTask.assignees) {
//         const email = assignee.email;
//         const name = assignee.name;

//         if (email) {
//           const subject = `New Task Assigned: ${savedTask.taskName}`;
//           const text = `Hello ${name},\n\nYou have been assigned a new task: ${savedTask.taskName}.\nDue Date: ${savedTask.dueDate}\n\nBest regards,\nYour Task Management System`;

//           await sendEmail(email, subject, text);
//           // console.log(`📨 Email sent to: ${email}`);

//           if (userSocketMap[email]) {
//             io.to(userSocketMap[email]).emit("new-task", savedTask);
//             // console.log(`📨 Sent task "${savedTask.taskName}" to ${email}`);
//           } else {
//             console.log(`No socket found for: ${email}`);
//           }
//         }
//       }
//     }

//     res.status(201).json({ message: "Task created", task: savedTask });
//   } catch (error) {
//     console.error("Error saving task:", error);
//     res.status(500).json({ message: "Failed to create task", error });
//   }
// });

// Task creation API
router.post("/", async (req, res) => {
  try {
    // Create the task
    const task = new Task(req.body);
    const savedTask = await task.save();

    // Access socket.io and userSocketMap from app
    const io = req.app.get("io");
    const userSocketMap = req.app.get("userSocketMap");

    // Notify each assignee and save the notification to DB
    if (Array.isArray(savedTask.assignees)) {
      for (const assignee of savedTask.assignees) {
        const email = assignee.email;
        const name = assignee.name;

        if (email) {
          const subject = `New Task Assigned: ${savedTask.taskName}`;
          const text = `Hello ${name},\n\nYou have been assigned a new task: ${savedTask.taskName}.\nDue Date: ${savedTask.dueDate}\n\nBest regards,\nYour Task Management System`;

          // Send email to the assignee
          await sendEmail(email, subject, text);

          // Create the notification with the action type 'task-created' and save it to the database
          const notification = new Notification({
            recipientEmail: email,
            message: `You have been assigned a new task: ${savedTask.taskName}`,
            taskId: savedTask._id,
            type: "user",
            action: "task-created", // Action type to track the event
          });

          await notification.save();

          // Emit the notification via socket.io
          if (userSocketMap[email]) {
            io.to(userSocketMap[email]).emit("new-task", savedTask);
          } else {
            console.log(`No socket found for: ${email}`);
          }
        }
      }
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

// Complete flag API to update task completion and send email

// router.put("/:id", async (req, res) => {
//   const { id } = req.params;
//   const { taskName, dueDate, assignees, priority, status, overdueNote } =
//     req.body;

//   try {
//     // Ensure only necessary fields are updated
//     const updatedTask = await Task.findByIdAndUpdate(
//       id,
//       { taskName, dueDate, assignees, priority, status, overdueNote },
//       { new: true } // Return the updated document
//     );

//     if (!updatedTask) {
//       return res.status(404).json({ message: "Task not found" });
//     }

//     // Send email to all assignees
//     if (Array.isArray(updatedTask.assignees)) {
//       for (const assignee of updatedTask.assignees) {
//         const email = assignee.email;
//         const name = assignee.name;

//         if (email) {
//           const subject = `Task Updated: ${updatedTask.taskName}`;
//           const text = `Hello ${name},\n\nThe task "${
//             updatedTask.taskName
//           }" has been updated. Here are the details:

// Task Name: ${updatedTask.taskName}
// Assigned To: ${updatedTask.assignees
//             .map((assignee) => assignee.name)
//             .join(", ")}
// Priority: ${updatedTask.priority}
// Status: ${updatedTask.status}
// Due Date: ${updatedTask.dueDate}
// Overdue Note: ${updatedTask.overdueNote || "N/A"}

// Please take note of the changes.`;

//           // Send email using your sendEmail function
//           await sendEmail(email, subject, text);
//           // console.log(`📨 Email sent to: ${email}`);
//         }
//       }
//     }

//     // Emit the updated task to all connected clients
//     const io = req.app.get("io");
//     io.emit("task-updated", updatedTask); // Emit task update event

//     res.json(updatedTask); // Send the updated task data in the response
//   } catch (error) {
//     console.error("Failed to update task", error);
//     res
//       .status(500)
//       .json({ message: "Server error while updating task", error });
//   }
// });

// router.patch("/:id", async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { completed } = req.body;
//     const userEmail = req.headers["x-user-email"]; // Employee email
//     const userName = req.headers["x-user-name"]; // Employee name

//     const updateData = {
//       completed,
//       ...(completed && {
//         completedAt: new Date(),
//         completedBy: {
//           name: userName,
//           email: userEmail,
//         },
//       }),
//     };

//     // Update task data
//     const updatedTask = await Task.findByIdAndUpdate(id, updateData, {
//       new: true,
//     });

//     if (!updatedTask) {
//       return res.status(404).json({ message: "Task not found" });
//     }

//     // If the task is completed, notify admin(s)
//     if (completed) {
//       const io = req.app.get("io");
//       const userSocketMap = req.app.get("userSocketMap");

//       // Fetch the role from localStorage (assuming you send the role from frontend)
//       const role = req.headers["x-user-role"]; // Passed from frontend as 'admin' or 'employee'

//       if (role === "admin") {
//         // If the user is an admin, fetch all admin sockets
//         const adminEntries = Object.entries(userSocketMap).filter(
//           ([email, socketId]) => {
//             // Assuming admin users are marked as 'admin' in their role (you can adjust this check accordingly)
//             return true; // Check for any users with admin role
//           }
//         );

//         // Send notification to all admins
//         adminEntries.forEach(([adminEmail, adminSocketId]) => {
//           io.to(adminSocketId).emit("task-completed", {
//             taskName: updatedTask.name,
//             userName: userName,
//             date: new Date().toISOString(), // Use ISO string for consistency
//           });
//           console.log(
//             `📢 Admin (${adminEmail}) notified: ${updatedTask.name} completed`
//           );
//         });
//       }

//       // Trigger Admin Notification Route
//       const notificationData = {
//         taskName: updatedTask.name,
//         userName: userName,
//         date: new Date().toISOString(),
//         type: "admin",
//       };

//       // Call the admin notification route here to generate admin notification
//       await axios
//         .post("http://localhost:5000/api/notifications/admin", notificationData)
//         .then((response) => {
//           console.log("Admin notification sent:", response.data);
//         })
//         .catch((error) => {
//           console.error("Error sending admin notification:", error);
//         });
//     }

//     res.json(updatedTask);
//   } catch (err) {
//     console.error("Error updating task:", err);
//     res.status(500).json({ error: err.message });
//   }
// });

// Update task completion and send email to assignees
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { taskName, dueDate, assignees, priority, status, overdueNote, updatedBy } = req.body;

  try {
    const existingTask = await Task.findById(id);
    if (!existingTask) {
      return res.status(404).json({ message: "Task not found" });
    }

    // Detect changes
    const changes = {};
    if (taskName && taskName !== existingTask.taskName)
      changes.taskName = `Changed task name to "${taskName}"`;
    if (priority && priority !== existingTask.priority)
      changes.priority = `Changed priority to "${priority}"`;
    if (status && status !== existingTask.status)
      changes.status = `Changed status to "${status}"`;
    if (dueDate && new Date(dueDate).toISOString() !== existingTask.dueDate.toISOString())
      changes.dueDate = `Changed due date to "${new Date(dueDate).toLocaleDateString()}"`;
    if (overdueNote && overdueNote !== existingTask.overdueNote)
      changes.overdueNote = `Changed overdue note`;

    // Apply the update
    const updatedTask = await Task.findByIdAndUpdate(
      id,
      { taskName, dueDate, assignees, priority, status, overdueNote },
      { new: true }
    );

    // Send notifications if any relevant fields changed
    for (const assignee of updatedTask.assignees) {
      if (updatedBy && assignee.email === updatedBy.email) continue;

    
      const email = assignee.email;
      const name = assignee.name;
    
      if (email) {
        const subject = `Task Updated: ${updatedTask.taskName}`;
        const text = `Hello ${name},\n\nThe task "${updatedTask.taskName}" has been updated. Please see the details below:\n\n${Object.values(changes).join('\n')}\n\nBest regards,\nTask Management System`;
    
        await sendEmail(email, subject, text);
        console.log("Backend received updatedBy:", updatedBy);
    
        const notification = new Notification({
          recipientEmail: email,
          message: `Task "${updatedTask.taskName}" has been updated.`,
          taskId: updatedTask._id,
          type: "user",
          action: "task-updated",
          updatedBy: JSON.stringify(updatedBy || { name: "System" }), // ✅ correct
          details: changes,
        });
    
        await notification.save();
      }
    }
    

    // Emit the updated task via socket
    const io = req.app.get("io");
    io.emit("task-updated", updatedTask);

    res.json(updatedTask);
  } catch (error) {
    console.error("Failed to update task", error);
    res.status(500).json({ message: "Server error while updating task", error });
  }
});


// Mark task as completed
// Mark task as completed
router.patch("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { completed } = req.body;
    const userEmail = req.headers["x-user-email"]; // Employee email
    const userName = req.headers["x-user-name"]; // Employee name

    const updateData = {
      completed,
      ...(completed && {
        completedAt: new Date(),
        completedBy: {
          name: userName,
          email: userEmail,
        },
      }),
    };

    // Update task data
    const updatedTask = await Task.findByIdAndUpdate(id, updateData, {
      new: true,
    });

    if (!updatedTask) {
      return res.status(404).json({ message: "Task not found" });
    }

    // If the task is completed, notify the admin(s)
    if (completed) {
      const io = req.app.get("io");
      const userSocketMap = req.app.get("userSocketMap");

      // Fetch the role from headers (assuming you send the role from frontend)
      const role = req.headers["x-user-role"]; // Passed from frontend as 'admin' or 'employee'

      if (role === "admin") {
        // If the user is an admin, fetch all admin sockets
        const adminEntries = Object.entries(userSocketMap).filter(
          ([email, socketId]) => {
            // Check for any users with admin role (you can adjust this check accordingly)
            return true; // Assume all admins are included in this logic
          }
        );

        // Send notification to all admins
        adminEntries.forEach(([adminEmail, adminSocketId]) => {
          io.to(adminSocketId).emit("task-completed", {
            taskName: updatedTask.name,
            userName: userName,
            date: new Date().toISOString(), // Use ISO string for consistency
          });
        });

        // Create notification for the admin(s) with the action type 'task-completed'
        const notificationData = {
          taskName: updatedTask.name,
          userName: userName,
          date: new Date().toISOString(),
          type: "admin", // Only admins should see this
          action: "task-completed", // Action type for task completion
        };

        // Send the admin notification
        await axios.post(
          "http://localhost:5000/api/notifications/admin",
          notificationData
        );
      }
    }

    res.json(updatedTask);
  } catch (err) {
    console.error("Error updating task:", err);
    res.status(500).json({ error: err.message });
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
