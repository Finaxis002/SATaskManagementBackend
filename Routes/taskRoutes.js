const express = require("express");
const router = express.Router();
const { sendEmail } = require("../email/emailService"); // Import email service
const Task = require("../Models/Task");
const Client = require("../Models/Client");

// const { userSocketMap } = require("../server");
const axios = require("axios");
const { sendTaskReminder } = require("../services/taskReminderService");

const Notification = require("../Models/Notification");
const io = require("../socket/socket");
const {
  emitUnreadNotificationCount,
} = require("../utils/emitNotificationCount");

router.post("/", async (req, res) => {
  try {
    const task = new Task(req.body);
    // Normalize and validate repetition fields
    // if (req.body.isRepetitive) {
    //   if (!["Monthly", "Annually"].includes(req.body.repeatType)) {
    //     return res.status(400).json({ message: "Invalid repeatType" });
    //   }

    //   if (!req.body.repeatDay || isNaN(req.body.repeatDay)) {
    //     return res
    //       .status(400)
    //       .json({ message: "Missing or invalid repeatDay" });
    //   }

    //   // For annual repetition, repeatMonth must also be present
    //   if (
    //     req.body.repeatType === "Annually" &&
    //     (req.body.repeatMonth === undefined ||
    //       req.body.repeatMonth < 1 ||
    //       req.body.repeatMonth > 12)
    //   ) {
    //     return res
    //       .status(400)
    //       .json({ message: "repeatMonth is required for annual repetition" });
    //   }
    // }

    const savedTask = await task.save();

    // Save client to Client collection (now tied to taskId)
    if (savedTask.clientName) {
      await Client.findOneAndUpdate(
        { taskId: savedTask._id },
        {
          name: savedTask.clientName,
          taskId: savedTask._id,
          createdAt: new Date(),
        },
        { upsert: true, new: true }
      );
    }

    const io = req.app.get("io");

    // Send notification to each assignee
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
        await emitUnreadNotificationCount(io, email); // 🔁 real-time for user
        console.log(`📡 Emitted notificationCountUpdated for ${email}`);
      }
    }

    // Always notify admin
    // Always notify admin - updated version with creator info
    const adminNotification = new Notification({
      message: `A new task "${savedTask.taskName}" was created by ${
        savedTask.assignedBy?.name || "unknown"
      }.`,
      taskId: savedTask._id,
      action: "task-created",
      type: "admin",
      read: false,
      createdAt: new Date(),
      createdBy: savedTask.assignedBy?.name || "unknown", // Additional field for creator
      createdByEmail: savedTask.assignedBy?.email || "unknown", // Additional field for creator email
    });

    await adminNotification.save();
    await emitUnreadNotificationCount(io, "admin"); // 🔁 real-time for admin
    io.emit("admin-notification", adminNotification);

    // Emit task to assigned user if socket exists
    if (userEmail && global.userSocketMap[userEmail]) {
      io.to(global.userSocketMap[userEmail]).emit("new-task", savedTask);
    }

    io.emit("new-task-created", savedTask);
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
    isRepetitive,
    repeatType,
    repeatDay,
    repeatMonth
  } = req.body;

  try {
    // Validate repetitive task fields if isRepetitive is true
    if (isRepetitive) {
      if (!repeatType || !repeatDay) {
        return res.status(400).json({ 
          message: "Repeat type and day are required for repetitive tasks" 
        });
      }
      if (repeatType === "Annually" && !repeatMonth) {
        return res.status(400).json({ 
          message: "Repeat month is required for annual repetition" 
        });
      }
    }

    const existingTask = await Task.findById(id);
    if (!existingTask) {
      return res.status(404).json({ message: "Task not found" });
    }

    // Detect changes (add repetitive task fields)
    const changes = {};
    // ... (existing change detection code)

    if (isRepetitive !== undefined && isRepetitive !== existingTask.isRepetitive)
      changes.isRepetitive = `Changed repetitive status to ${isRepetitive}`;

    if (repeatType && repeatType !== existingTask.repeatType)
      changes.repeatType = `Changed repeat type to "${repeatType}"`;

    if (repeatDay && repeatDay !== existingTask.repeatDay)
      changes.repeatDay = `Changed repeat day to "${repeatDay}"`;

    if (repeatMonth && repeatMonth !== existingTask.repeatMonth)
      changes.repeatMonth = `Changed repeat month to "${repeatMonth}"`;

    // Update the task (include all fields)
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
        remark,
        isRepetitive,
        repeatType,
        repeatDay,
        repeatMonth
      },
      { new: true }
    );

    // ... rest of your existing code
  } catch (error) {
    console.error("❌ Failed to update task", error);
    res.status(500).json({ 
      message: "Server error while updating task",
      error: error.message // Include actual error message
    });
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
