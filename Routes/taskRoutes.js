const express = require("express");
const router = express.Router();
const { sendEmail } = require("../email/emailService"); // Import email service
const Task = require("../Models/Task");
const Client = require("../Models/Client");
const { getNextRepetitionDate, getNextDueDate } = require("../utils/dateUtils");

// const { userSocketMap } = require("../server");
const axios = require("axios");
const { sendTaskReminder } = require("../services/taskReminderService");

const Notification = require("../Models/Notification");
const io = require("../socket/socket");
const {
  emitUnreadNotificationCount,
} = require("../utils/emitNotificationCount");

router.put("/hide-completed", async (req, res) => {
  try {
    console.log("Attempting to hide completed tasks...");
    const filter = {
      status: "Completed",
      $or: [{ isHidden: false }, { isHidden: { $exists: false } }],
    };
    const update = { $set: { isHidden: true } };

    console.log("Filter:", filter);

    const result = await Task.updateMany(filter, update);
    console.log("Update result:", result);

    const hiddenCount = await Task.countDocuments({
      status: "Completed",
      isHidden: true,
    });
    console.log(`Now ${hiddenCount} tasks are hidden`);

    const io = req.app.get("io");
    io.emit("task-updated", { message: "Completed tasks hidden" });

    res.status(200).json({
      message: "Completed tasks hidden successfully",
      hiddenCount,
    });
  } catch (err) {
    console.error("Failed to hide completed tasks:", err);
    res.status(500).json({ message: "Failed to hide completed tasks" });
  }
});

router.post("/", async (req, res) => {
  try {
    const task = new Task(req.body);
    const now = new Date();

    // Handle repetition setup
    if (task.isRepetitive) {
      // Get current date in IST midnight (00:00)
      const istNow = new Date();
      istNow.setHours(0, 0, 0, 0);

      task.nextRepetitionDate = getNextRepetitionDate(
        istNow, // ⬅️ base date now starts at 00:00 IST
        task.repeatType,
        task.repeatDay,
        task.repeatMonth
      );

      task.nextDueDate = getNextDueDate(
        task.dueDate,
        task.repeatType,
        task.repeatDay,
        task.repeatMonth
      );
      task.repetitionCount = 1;
    }

  

    // Save task
    const savedTask = await task.save();

    // Save or upsert client safely
    if (savedTask.clientName) {
      try {
        await Client.findOneAndUpdate(
          { name: savedTask.clientName },
          {
            name: savedTask.clientName,
            taskId: savedTask._id,
            createdAt: new Date(),
          },
          { upsert: true, new: true }
        );
      } catch (clientError) {
        console.warn("⚠️ Could not upsert client:", clientError.message);
      }
    }

    const io = req.app.get("io");

    // Notify assignees
    if (Array.isArray(savedTask.assignees)) {
      for (const assignee of savedTask.assignees) {
        const notificationMessage = savedTask.isRepetitive
          ? `You have been assigned a new *repetitive task*: ${
              savedTask.taskName
            }. It will repeat ${savedTask.repeatType.toLowerCase()}.`
          : `You have been assigned a new task: ${savedTask.taskName}`;

        const notification = new Notification({
          recipientEmail: assignee.email,
          message: notificationMessage,
          taskId: savedTask._id,
          action: "task-created",
          type: "user",
          read: false,
          createdAt: new Date(),
        });

        await notification.save();
        await emitUnreadNotificationCount(io, assignee.email);
        console.log(`📡 Notification count updated for ${assignee.email}`);
      }
    }

    // Notify admin
    const adminNotification = new Notification({
      message: `A new task "${savedTask.taskName}" was created by ${
        savedTask.assignedBy?.name || "Unknown"
      }.`,
      taskId: savedTask._id,
      action: "task-created",
      type: "admin",
      read: false,
      createdAt: new Date(),
      createdBy: savedTask.assignedBy?.name || "unknown",
      createdByEmail: savedTask.assignedBy?.email || "unknown",
    });

    if (savedTask.isRepetitive) {
      const repetitiveAdminNote = new Notification({
        message: `Repetitive task "${savedTask.taskName}" (Type: ${savedTask.repeatType}) created by ${savedTask.assignedBy?.name}.`,
        taskId: savedTask._id,
        action: "repetitive-task-created",
        type: "admin",
        read: false,
        createdAt: new Date(),
      });

      await repetitiveAdminNote.save();
      io.emit("admin-notification", repetitiveAdminNote);
    }

    await adminNotification.save();
    await emitUnreadNotificationCount(io, "admin");
    io.emit("admin-notification", adminNotification);

    // Emit to all for frontend updates
    io.emit("new-task-created", savedTask);

    // Schedule reminder
    await sendTaskReminder(savedTask);

    let message = "Task created";
    if (savedTask.isRepetitive && savedTask.nextRepetitionDate) {
      const nextDate = new Date(savedTask.nextRepetitionDate);
      const dd = String(nextDate.getDate()).padStart(2, "0");
      const mm = String(nextDate.getMonth() + 1).padStart(2, "0");
      const yy = String(nextDate.getFullYear()).slice(-2);

      message += ` (This is a repetitive task. Next repetition on ${dd}/${mm}/${yy})`;
    }

    res.status(201).json({ message, task: savedTask });
  } catch (error) {
    console.error("❌ Error saving task:", error);
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
    remark, // ✅ this is correct
    code,
    isRepetitive,
    repeatType,
    repeatDay,
    repeatMonth,
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

    if (isRepetitive && repeatType && repeatType !== existingTask.repeatType) {
      changes.repeatType = `Changed Repeat Type to "${repeatType}"`;
    }

    if (isRepetitive && repeatDay && repeatDay !== existingTask.repeatDay) {
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
        repeatMonth,
      },
      { new: true }
    );

    // Recalculate next repetition date if repetition settings changed
    if (updatedTask.isRepetitive && (repeatType || repeatDay || repeatMonth)) {
      const newRepetitionDate = getNextRepetitionDate(
        updatedTask.createdAt,
        updatedTask.repeatType,
        updatedTask.repeatDay,
        updatedTask.repeatMonth
      );

      const newDueDate = getNextDueDate(
        updatedTask.dueDate,
        updatedTask.repeatType,
        updatedTask.repeatDay,
        updatedTask.repeatMonth
      );

      updatedTask.nextRepetitionDate = newRepetitionDate;
      updatedTask.nextDueDate = newDueDate;
      await updatedTask.save();
    }

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

    let message = "Task updated";
    if (updatedTask.isRepetitive && updatedTask.nextRepetitionDate) {
      message += ` (This is a repetitive task. Next repetition on ${new Date(
        updatedTask.nextRepetitionDate
      ).toLocaleDateString()})`;
    }

    res.json({ message, task: updatedTask });
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

// GET /api/tasks/by-client-name/:clientName - fetch tasks by client name
router.get("/by-client-name/:clientName", async (req, res) => {
  try {
    const clientName = decodeURIComponent(req.params.clientName);

    // Case-insensitive exact match for safety
    const tasks = await Task.find({
      clientName: { $regex: `^${clientName}$`, $options: "i" }
    });

    res.json(tasks);
  } catch (error) {
    console.error("❌ Failed to fetch tasks by client name", error);
    res.status(500).json({ error: "Failed to fetch tasks by client name" });
  }
});

module.exports = router;
