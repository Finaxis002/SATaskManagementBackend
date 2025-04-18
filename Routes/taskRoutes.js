const express = require("express");
const router = express.Router();

const Task = require("../Models/Task");
const { io, userSocketMap } = require("../server");


// Create a new task
router.post("/", async (req, res) => {
  try {
    console.log("Received Task Body:", req.body);
    const task = new Task(req.body);
    // await task.save();
    const savedTask = await task.save();

// 🔌 Access socket.io and userSocketMap from app
const io = req.app.get("io");
const userSocketMap = req.app.get("userSocketMap");

const userEmail = savedTask?.assignee?.email;

if (userEmail && userSocketMap[userEmail]) {
  io.to(userSocketMap[userEmail]).emit("new-task", savedTask);
  console.log(`📨 Sent task "${savedTask.name}" to ${userEmail}`);
}
    res.status(201).json({ message: "Task created", task });
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
//     const { id } = req.params;
//     const { completed } = req.body;
  
//     try {
//       const updatedTask = await Task.findByIdAndUpdate(
//         id,
//         { completed },
//         { new: true } // return the updated document
//       );
  
//       if (!updatedTask) {
//         return res.status(404).json({ message: "Task not found" });
//       }
  
//       res.json(updatedTask);
//     } catch (error) {
//       console.error("Failed to update task", error);
//       res.status(500).json({ message: "Server error while updating task" });
//     }
//   });
router.patch('/:id', async (req, res) => {
  const { id } = req.params;
  const { completed } = req.body;

  try {
    const originalTask = await Task.findById(id);
    const updatedTask = await Task.findByIdAndUpdate(
      id,
      { 
        completed,
        completedAt: completed ? new Date() : null,
        completedBy: completed ? {
          name: req.user.name,
          email: req.user.email
        } : null
      },
      { new: true }
    );

    if (!updatedTask) {
      return res.status(404).json({ message: "Task not found" });
    }

    // Debugging logs
    console.log('Task completion status:', {
      wasCompleted: originalTask.completed,
      nowCompleted: updatedTask.completed
    });

    if (completed && !originalTask.completed) {
      const io = req.app.get('io');
      console.log('Emitting task-completed event to admins');
      
      // Get all admin emails from your database
      const admins = await User.find({ role: 'admin' });
      const adminEmails = admins.map(admin => admin.email);
      
      // Emit to all admins
      adminEmails.forEach(adminEmail => {
        const adminSocketId = userSocketMap[adminEmail];
        if (adminSocketId) {
          io.to(adminSocketId).emit('task-completed', {
            taskName: updatedTask.name,
            userName: req.user.name,
            date: new Date().toLocaleDateString(),
            adminEmail: adminEmail
          });
          console.log(`Sent notification to admin: ${adminEmail}`);
        }
      });
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