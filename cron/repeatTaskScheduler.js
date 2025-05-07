// cron/scheduleTaskRepeats.js

const cron = require("node-cron");
const Task = require("../Models/Task");

const scheduleTaskRepeats = async () => {
  const now = new Date();
  const tasks = await Task.find({ isRepetitive: true });

  for (const task of tasks) {
    const due = new Date(task.dueDate);
    const today = new Date(now.toDateString());

    const repeatLimit = 365; // Repeat 1 year into future
    const existingTasks = await Task.find({ isRepetitive: true });
    
    for (const task of existingTasks) {
      const start = new Date(task.dueDate);
      const repetitions = [];
    
      for (let i = 1; i <= repeatLimit; i++) {
        const nextDate = getNextDueDate(task, i);
        
        // Only push future dates
        if (nextDate > new Date()) {
          repetitions.push(new Task({
            ...task.toObject(),
            _id: undefined,
            assignedDate: new Date(),
            createdAt: new Date(),
            dueDate: nextDate,
            repetitionCount: (task.repetitionCount || 1) + i,
          }));
        }
      }
    
      if (repetitions.length > 0) {
        await Task.insertMany(repetitions);
        task.repetitionCount += repeatLimit;
        await task.save();
      }
    }
    
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
      const month = task.repeatMonth || current.getMonth() + 1;
      return new Date(current.getFullYear() + offset, month - 1, day);
    default:
      return current;
  }
}



// ⏰ Schedule it to run every day at 12:00 AM
cron.schedule("0 0 * * *", scheduleTaskRepeats);

module.exports = scheduleTaskRepeats;
