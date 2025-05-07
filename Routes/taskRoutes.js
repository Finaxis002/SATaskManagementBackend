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
    if (task.isRepetitive) {
      const now = new Date();
      const repeatDay = task.repeatDay || now.getDate();
    
      switch (task.repeatType) {
        case "Every 5 Minutes":
          task.nextRepetitionDate = new Date(now.getTime() + 5 * 60 * 1000); // 5 minutes from now
          break;
        case "Daily":
          task.nextRepetitionDate = new Date(now.setDate(now.getDate() + 1));
          break;
        case "Monthly":
          task.nextRepetitionDate = new Date(now.setMonth(now.getMonth() + 1, repeatDay));
          break;
        case "Quarterly":
          task.nextRepetitionDate = new Date(now.setMonth(now.getMonth() + 3, repeatDay));
          break;
        case "Every 6 Months":
          task.nextRepetitionDate = new Date(now.setMonth(now.getMonth() + 6, repeatDay));
          break;
        case "Annually":
          task.nextRepetitionDate = new Date(now.getFullYear() + 1, task.repeatMonth - 1, repeatDay);
          break;
      }
    
      task.repetitionCount = 1; // Initialize repetition count
    }
    
    

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
      changes.remark = `Added Remark :  "${remark}"`; // Log the change in remarks
    
    // Repetition-related change logging
    if (isRepetitive !== existingTask.isRepetitive) {
      changes.isRepetitive = isRepetitive
        ? "Marked as a repetitive task"
        : "Unmarked as a repetitive task";
    }
    
    if (
      isRepetitive &&
      repeatType &&
      repeatType !== existingTask.repeatType
    ) {
      changes.repeatType = `Changed Repeat Type to "${repeatType}"`;
    }
    
    if (
      isRepetitive &&
      repeatDay &&
      repeatDay !== existingTask.repeatDay
    ) {
      changes.repeatDay = `Changed Repeat Day to "${repeatDay}"`;
    }
    
    if (
      isRepetitive &&
      repeatType === "Annually" &&
      repeatMonth &&
      repeatMonth !== existingTask.repeatMonth
    ) {
      changes.repeatMonth = `Changed Repeat Month to "${repeatMonth}"`;
    }
    

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
        isRepetitive,
        repeatType,
        repeatDay,
        repeatMonth
      },
      { new: true }
    );
    // Update client linked to this task
    if (clientName) {
      await Client.findOneAndUpdate(
        { taskId: id }, // taskId = task._id
        { name: clientName },
        { new: true }
      );
    }

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
