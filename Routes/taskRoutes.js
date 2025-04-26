const express = require("express");
const router = express.Router();
const { sendEmail } = require("../email/emailService");  // Import email service
const Task = require("../Models/Task");
const { io, userSocketMap } = require("../server");
const axios = require('axios');
const { sendTaskReminder } = require("../services/taskReminderService"); 



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
    await sendTaskReminder(savedTask); 
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


// router.patch('/:id', async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { completed } = req.body;
//     const userEmail = req.headers['x-user-email'];
//     const userName = req.headers['x-user-name'];

//     const updateData = {
//       completed,
//       ...(completed && {
//         completedAt: new Date(),
//         completedBy: {
//           name: userName,
//           email: userEmail
//         }
//       })
//     };

//     const updatedTask = await Task.findByIdAndUpdate(
//       id,
//       updateData,
//       { new: true }
//     );

//     // Notify admin using existing socket implementation
//     if (completed) {
//       const io = req.app.get('io');
//       const userSocketMap = req.app.get('userSocketMap');
      
//       // Find all admin users (assuming admin emails contain 'admin')
//       const adminEntries = Object.entries(userSocketMap).filter(([email]) => 
//         email.includes('admin') || email.includes('administrator')
//       );

//       // Send notification to all admins
//       adminEntries.forEach(([adminEmail, adminSocketId]) => {
//         io.to(adminSocketId).emit('task-completed', {
//           taskName: updatedTask.name,
//           userName: userName,
//           date: new Date().toISOString()  // Use ISO string for consistency
//         });
//         console.log(`📢 Admin (${adminEmail}) notified: ${updatedTask.name} completed`);
//       });
//     }

// // //   const { id } = req.params;
// // //   const { name, due, assignee, completed } = req.body;

// // //   try {
// // //       // Update the task with all necessary fields
// // //       const updatedTask = await Task.findByIdAndUpdate(
// // //           id,
// // //           { name, due, assignee, completed },
// // //           { new: true } // return the updated document
// // //       );

// // //       if (!updatedTask) {
// // //           return res.status(404).json({ message: "Task not found" });
// // //       }

// // //       // Emit the updated task to all connected clients
// // //       const io = req.app.get("io");
// // //       io.emit("task-updated", updatedTask); // Emit task update event

// // //       res.json(updatedTask);
// // //   } catch (error) {
// // //       console.error("Failed to update task", error);
// // //       res.status(500).json({ message: "Server error while updating task" });
// // //   }
// // // });

// // // Complete flag API to update task completion and send email
// // router.patch('/:id', async (req, res) => {
// //   const { id } = req.params;
// //   const { name, due, assignee, completed } = req.body;

// //   try {
// //       // Update the task with all necessary fields
// //       const updatedTask = await Task.findByIdAndUpdate(
// //           id,
// //           { name, due, assignee, completed },
// //           { new: true } // return the updated document
// //       );

// //       if (!updatedTask) {
// //           return res.status(404).json({ message: "Task not found" });
// //       }

// //       // Emit the updated task to all connected clients
// //       const io = req.app.get("io");
// //       io.emit("task-updated", updatedTask); // Emit task update event

// //       // Send email to the assignee regarding the task update
// //       if (updatedTask.assignee && updatedTask.assignee.email) {
// //           const subject = `Task Updated: ${updatedTask.name}`;
// //           const text = `
// //               Hello ${updatedTask.assignee.name},\n\n
// //               Your task has been updated:\n
// //               Task: ${updatedTask.name}\n
// //               Due Date: ${updatedTask.due}\n
// //               Status: ${completed ? "Completed" : "Not Completed"}\n\n
// //               Best regards,\n
// //               Task Management System
// //           `;
// //           await sendEmail(updatedTask.assignee.email, subject, text);  // Send email to the assignee
// //           console.log(`📨 Email sent to: ${updatedTask.assignee.email}`);
// //       } else {
// //           console.log("No email found for the assignee");
// //       }

// //       res.json(updatedTask);
// //   } catch (error) {
// //       console.error("Failed to update task", error);
// //       res.status(500).json({ message: "Server error while updating task" });
// //   }
// // });


//     res.json(updatedTask);
//   } catch (error) {
//     console.error('Task update error:', error);
//     res.status(500).json({ message: error.message });
//   }
// });
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { completed } = req.body;
    const userEmail = req.headers['x-user-email']; // Employee email
    const userName = req.headers['x-user-name'];  // Employee name

    const updateData = {
      completed,
      ...(completed && {
        completedAt: new Date(),
        completedBy: {
          name: userName,
          email: userEmail
        }
      })
    };

    // Update task data
    const updatedTask = await Task.findByIdAndUpdate(id, updateData, { new: true });

    if (!updatedTask) {
      return res.status(404).json({ message: "Task not found" });
    }

    // If the task is completed, notify admin(s)
    if (completed) {
      const io = req.app.get('io');
      const userSocketMap = req.app.get('userSocketMap');

      // Fetch the role from localStorage (assuming you send the role from frontend)
      const role = req.headers['x-user-role'];  // Passed from frontend as 'admin' or 'employee'

      if (role === 'admin') {
        // If the user is an admin, fetch all admin sockets
        const adminEntries = Object.entries(userSocketMap).filter(([email, socketId]) => {
          // Assuming admin users are marked as 'admin' in their role (you can adjust this check accordingly)
          return true; // Check for any users with admin role
        });

        // Send notification to all admins
        adminEntries.forEach(([adminEmail, adminSocketId]) => {
          io.to(adminSocketId).emit('task-completed', {
            taskName: updatedTask.name,
            userName: userName,
            date: new Date().toISOString()  // Use ISO string for consistency
          });
          console.log(`📢 Admin (${adminEmail}) notified: ${updatedTask.name} completed`);
        });
      }

      // Trigger Admin Notification Route
      // const notificationData = {
      //   taskName: updatedTask.name,
      //   userName: userName,
      //   date: new Date().toISOString(),
      //   type: 'admin',
      // };
      
      const notificationData = {
        taskName: updatedTask.name,
        userName: userName,
        date: new Date().toISOString(),  // Ensure the correct date format
        recipientEmail: 'admin@example.com',  // Ensure this is set correctly, or dynamically fetch the admin's email
        message: `${userName} completed the task: ${updatedTask.name}`,
        taskId: updatedTask._id,  // Ensure this is set
        type: 'admin',  // This is important to distinguish the notification type
      };

      // Call the admin notification route here to generate admin notification
      await axios.post('http://localhost:5000/api/notifications/admin', notificationData)
        .then(response => {
          console.log('Admin notification sent:', response.data);
        })
        .catch(error => {
          console.error('Error sending admin notification:', error);
        });
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