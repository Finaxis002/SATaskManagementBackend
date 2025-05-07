// cron/scheduleTaskRepeats.js

const cron = require("node-cron");
const Task = require("../Models/Task");

const scheduleTaskRepeats = async () => {
  const now = new Date();
  const tasks = await Task.find({ isRepetitive: true });

  for (const task of tasks) {
    const due = new Date(task.dueDate);
    const today = new Date(now.toDateString());

    if (due.toDateString() === today.toDateString()) {
      const newTask = new Task({
        ...task.toObject(),
        _id: undefined, // remove Mongo _id for new doc
        assignedDate: new Date(),
        createdAt: new Date(),
        dueDate: getNextDueDate(task),
      });

      task.dueDate = newTask.dueDate;
      task.repetitionCount += 1;

      await newTask.save();
      await task.save();
    }
  }
};

function getNextDueDate(task) {
  const current = new Date(task.dueDate);
  const day = task.repeatDay || current.getDate();

  switch (task.repeatType) {
    case "Daily":
      return new Date(current.setDate(current.getDate() + 1));
    case "Monthly":
      return new Date(current.getFullYear(), current.getMonth() + 1, day);
    case "Quarterly":
      return new Date(current.getFullYear(), current.getMonth() + 3, day);
    case "Every 6 Months":
      return new Date(current.getFullYear(), current.getMonth() + 6, day);
    case "Annually":
      const month = task.repeatMonth || current.getMonth() + 1;
      return new Date(current.getFullYear() + 1, month - 1, day);
    default:
      return current;
  }
}

// ⏰ Schedule it to run every day at 12:00 AM
cron.schedule("0 0 * * *", scheduleTaskRepeats);

module.exports = scheduleTaskRepeats;
