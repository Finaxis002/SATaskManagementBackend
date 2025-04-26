const express = require("express");
const router = express.Router();
const { sendEmail } = require("../email/emailService"); // Import email service
const Task = require("../Models/Task");

const { userSocketMap } = require("../server");
const axios = require('axios');
const { sendTaskReminder } = require("../services/taskReminderService"); 





const Notification = require("../Models/Notification");
const io = require("../socket/socket");
const {
  emitUnreadNotificationCount,
} = require("../utils/emitNotificationCount");


router.post("/", async (req, res) => {
  try {
    const task = new Task(req.body);
    const savedTask = await task.save();

    const io = req.app.get("io");

    if (Array.isArray(savedTask.assignees)) {
      for (const assignee of savedTask.assignees) {
        const email = assignee.email;

        const notification = new Notification({
          recipientEmail: email,
          message: `You have been assigned a new task: ${savedTask.taskName}`,
          taskId: savedTask._id,
          action: "task-created",
          type: "user",
          read: false,
          createdAt: new Date(),
        });

        await notification.save();

        // ✅ Emit for each user inside the loop
        await emitUnreadNotificationCount(io, email);
        console.log(`📡 Emitted notificationCountUpdated for ${email}`);
      }
    }


    // Emit task to assigned user if socket exists
    if (userEmail && userSocketMap[userEmail]) {
      console.log(`Sending task to user: ${userEmail}`);  // Log before emitting
      io.to(userSocketMap[userEmail]).emit("new-task", savedTask);  // Emit task to assigned user
      console.log(`📨 Sent task "${savedTask.name}" to ${userEmail}`);
    } else {
      console.log("No socket found for the user or email not assigned");
    }
    

    io.emit("new-task-created", savedTask);
    console.log("📡 Backend emitted notificationCountUpdated");
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
  // io.emit("task-updated");
});

router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const {
    taskName,
    workDesc,
    dueDate,
    assignees,
    priority,
    status,
    overdueNote,
    updatedBy,
    taskCategory,
    department,
    clientName,
    remark,  
    code,
  } = req.body;

  try {
    const existingTask = await Task.findById(id);
    if (!existingTask) {
      return res.status(404).json({ message: "Task not found" });
    }

  
    // Detect changes
    const changes = {};
    if (taskName && taskName !== existingTask.taskName)
      changes.taskName = `Changed task name to "${taskName}"`;

    if (workDesc && workDesc !== existingTask.workDesc)
      changes.workDesc = `Changed task Description to "${workDesc}"`;

    if (priority && priority !== existingTask.priority)
      changes.priority = `Changed priority to "${priority}"`;

    if (status && status !== existingTask.status)
      changes.status = `Changed status to "${status}"`;

    if (
      dueDate &&
      new Date(dueDate).toISOString() !== existingTask.dueDate.toISOString()
    )
      changes.dueDate = `Changed due date to "${new Date(
        dueDate
      ).toLocaleDateString()}"`;

    if (overdueNote && overdueNote !== existingTask.overdueNote)
      changes.overdueNote = `Changed overdue note`;

    if (taskCategory && taskCategory !== existingTask.taskCategory)
      changes.taskCategory = `Changed task category to "${taskCategory}"`;

    if (department && department !== existingTask.department)
      changes.department = `Changed department to "${department}"`;

    if (clientName && clientName !== existingTask.clientName)
      changes.clientName = `Changed client name to "${clientName}"`;

    if (code && code !== existingTask.code)
      changes.code = `Changed task code to "${code}"`;

     // Detect and update the remark
     if (remark && remark !== existingTask.remark)
      changes.remark = `Changed remark to "${remark}"`; // Log the change in remarks


    // Update the task
    const updatedTask = await Task.findByIdAndUpdate(
      id,
      {
        taskName,
        workDesc,
        dueDate,
        assignees,
        priority,
        status,
        overdueNote,
        taskCategory,
        department,
        clientName,
        code,
        remark, // Add the remark here
      },
      { new: true }
    );

    const io = req.app.get("io");

    // 🔔 1. Notify each user (assignee) — has email
    for (const assignee of updatedTask.assignees) {
      // ✅ Skip sending notification to the person who made the update
      if (updatedBy?.email === assignee.email) {
        console.log(`⏭️ Skipping notification for updater: ${assignee.email}`);
        continue;
      }
    
      const email = assignee.email;
      const name = assignee.name;
    
 
      const notification = new Notification({
        recipientEmail: email,
        message: `Task "${updatedTask.taskName}" has been updated.`,
        taskId: updatedTask._id,
        type: "user",
        action: "task-updated",
        updatedBy: JSON.stringify(updatedBy || { name: "System" }),
        details: changes,
        read: false,
      });
    
      await notification.save();
    
      // ✅ Emit count update only to this user
      await emitUnreadNotificationCount(io, email);
      console.log(`📢 User notification sent and count emitted for: ${email}`);
    }
    

    // 🔔 2. Notify all admins (no email, just role)
    const adminNotification = new Notification({
      message: `Task "${updatedTask.taskName}" has been updated.`,
      taskId: updatedTask._id,
      type: "admin", // role-based
      action: "task-updated",
      updatedBy: JSON.stringify(updatedBy || { name: "System" }),
      details: changes,
      read: false,
    });

    await adminNotification.save();

    // Emit count update for admins (frontend will re-fetch)
    io.emit("notificationCountUpdated", {
      email: "admin", // ✅ unified key
      count: null, // frontend will re-fetch anyway
    });

    console.log("📢 Admin notification created & broadcasted");

    // Emit updated task to everyone
    io.emit("task-updated", updatedTask);

    res.json(updatedTask);
  } catch (error) {
    console.error("❌ Failed to update task", error);
    res
      .status(500)
      .json({ message: "Server error while updating task", error });
  }
});

// Mark task as completed
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

//     // If the task is completed, notify the admin(s)
//     if (completed) {
//       const io = req.app.get("io");
//       const userSocketMap = req.app.get("userSocketMap");

//       // Fetch the role from headers (assuming you send the role from frontend)
//       const role = req.headers["x-user-role"]; // Passed from frontend as 'admin' or 'employee'

//       if (role === "admin") {
//         // If the user is an admin, fetch all admin sockets
//         const adminEntries = Object.entries(userSocketMap).filter(
//           ([email, socketId]) => {
//             // Check for any users with admin role (you can adjust this check accordingly)
//             return true; // Assume all admins are included in this logic
//           }
//         );

//         // Send notification to all admins
//         adminEntries.forEach(([adminEmail, adminSocketId]) => {
//           io.to(adminSocketId).emit("task-completed", {
//             taskName: updatedTask.name,
//             userName: userName,
//             date: new Date().toISOString(), // Use ISO string for consistency
//           });
//         });


//       // Trigger Admin Notification Route
//       // const notificationData = {
//       //   taskName: updatedTask.name,
//       //   userName: userName,
//       //   date: new Date().toISOString(),
//       //   type: 'admin',
//       // };
      
//       const notificationData = {
//         taskName: updatedTask.name,
//         userName: userName,
//         date: new Date().toISOString(),  // Ensure the correct date format
//         recipientEmail: 'admin@example.com',  // Ensure this is set correctly, or dynamically fetch the admin's email
//         message: `${userName} completed the task: ${updatedTask.name}`,
//         taskId: updatedTask._id,  // Ensure this is set
//         type: 'admin',  // This is important to distinguish the notification type
//       };

//       // Call the admin notification route here to generate admin notification
//       await axios.post('http://localhost:5000/api/notifications/admin', notificationData)
//         .then(response => {
//           console.log('Admin notification sent:', response.data);
//         })
//         .catch(error => {
//           console.error('Error sending admin notification:', error);
//         });

//     }

//     res.json(updatedTask);
//   } catch (err) {
//     console.error("Error updating task:", err);
//     res.status(500).json({ error: err.message });
//   }
// });

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

