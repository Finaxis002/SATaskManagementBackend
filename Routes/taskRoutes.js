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
// In your taskRoutes.js
// router.patch('/:id', async (req, res) => {
//   const { id } = req.params;
//   const { completed } = req.body;

//   try {
//     console.log('Attempting to update task:', id);
//     console.log('Request user:', req.user); // Check if user exists
//     console.log('Request body:', req.body);

//     const updateData = {
//       completed,
//       ...(completed && {
//         completedAt: new Date(),
//         completedBy: {
//           name: req.user?.name || 'Unknown',
//           email: req.user?.email || 'unknown@example.com'
//         }
//       })
//     };

//     const updatedTask = await Task.findByIdAndUpdate(
//       id,
//       updateData,
//       { 
//         new: true,
//         runValidators: true,
//         context: 'query' // Helps with certain validation issues
//       }
//     );

//     if (!updatedTask) {
//       return res.status(404).json({ message: "Task not found" });
//     }

//     console.log('Successfully updated task:', updatedTask);
//     return res.json(updatedTask);

//   } catch (error) {
//     console.error('FULL ERROR DETAILS:');
//     console.error('Name:', error.name);
//     console.error('Message:', error.message);
//     console.error('Stack:', error.stack);
    
//     if (error.name === 'ValidationError') {
//       console.error('Validation Errors:', error.errors);
//     }
    
//     if (error.name === 'CastError') {
//       console.error('Cast Error Path:', error.path);
//       console.error('Cast Error Value:', error.value);
//     }

//     return res.status(500).json({ 
//       message: "Server error while updating task",
//       error: process.env.NODE_ENV === 'development' ? error.message : undefined
//     });
//   }
// });
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { completed } = req.body;
    const userEmail = req.headers['x-user-email'];
    const userName = req.headers['x-user-name'];

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

    const updatedTask = await Task.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    );

    // Notify admin using existing socket implementation
    if (completed) {
      const io = req.app.get('io');
      const adminSocketId = req.app.get('userSocketMap')['admin@example.com']; // Your admin email
      
      if (adminSocketId) {
        io.to(adminSocketId).emit('task-completed', {
          taskName: updatedTask.name,
          userName: userName,
          date: new Date().toLocaleDateString()
        });
        console.log(`📢 Admin notified: ${updatedTask.name} completed`);
      }
    }

    res.json(updatedTask);
  } catch (error) {
    console.error('Task update error:', error);
    res.status(500).json({ message: error.message });
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