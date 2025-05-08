const cron = require("node-cron");
const Task = require("../Models/Task");

const scheduleTaskRepeats = async () => {
  try {
    // Find all repetitive tasks that need their next occurrence created
    const tasks = await Task.find({ 
      isRepetitive: true,
      $or: [
        { nextRepetitionDate: { $lte: new Date() } },
        { nextRepetitionDate: { $exists: false } }
      ]
    });

    for (const task of tasks) {
      const nextDate = getNextDueDate(task);
      
      if (nextDate > new Date()) {
        // Create the next occurrence
        const newTask = new Task({
          ...task.toObject(),
          _id: undefined,
          assignedDate: new Date(),
          createdAt: new Date(),
          dueDate: nextDate,
          status: "To Do", // Reset status for new task
          repetitionCount: (task.repetitionCount || 1) + 1,
          nextRepetitionDate: getNextDueDate(task, 2) // Set the date after next
        });

        await newTask.save();
        
        // Update original task with next repetition date
        task.nextRepetitionDate = nextDate;
        task.repetitionCount = (task.repetitionCount || 1) + 1;
        await task.save();
      }
    }
  } catch (error) {
    console.error("Error in scheduleTaskRepeats:", error);
  }
};

function getNextDueDate(task, offset = 1) {
  const current = new Date(task.dueDate);
  const day = task.repeatDay || current.getDate();

  switch (task.repeatType) {
    case "Daily":
      return new Date(current.getFullYear(), current.getMonth(), current.getDate() + offset);
    case "Monthly":
      return new Date(current.getFullYear(), current.getMonth() + offset, day);
    case "Quarterly":
      return new Date(current.getFullYear(), current.getMonth() + offset * 3, day);
    case "Every 6 Months":
      return new Date(current.getFullYear(), current.getMonth() + offset * 6, day);
    case "Annually":
      const month = task.repeatMonth || current.getMonth();
      return new Date(current.getFullYear() + offset, month, day);
    default:
      return current;
  }
}

// Schedule it to run every day at 12:00 AM
cron.schedule("0 0 * * *", scheduleTaskRepeats);

module.exports = scheduleTaskRepeats;