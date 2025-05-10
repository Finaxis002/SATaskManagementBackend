const cron = require("node-cron");
const Task = require("../Models/Task");
const getNextDueDate = require("../utils/getNextDueDate");

const scheduleTaskRepeats = async () => {
  try {
    const now = new Date();

    // Find all repetitive tasks that need their next occurrence created
    const tasks = await Task.find({
      isRepetitive: true,
      $or: [
        { nextRepetitionDate: { $lte: now } },
        { nextRepetitionDate: { $exists: false } },
      ],
    });

    console.log(
      `[${now.toISOString()}] Found ${
        tasks.length
      } repetitive tasks to process.`
    );

   for (const task of tasks) {
  // Always base next repetitions from last known due date or nextRepetitionDate
  const baseDate = task.nextRepetitionDate || task.dueDate;

  const newDueDate = getNextDueDate({ ...task.toObject(), dueDate: baseDate }, 0); // current repetition
  const nextDueDate = getNextDueDate({ ...task.toObject(), dueDate: baseDate }, 1); // future repetition

  if (newDueDate.setHours(0, 0, 0, 0) >= now.setHours(0, 0, 0, 0)) {
    const newTaskData = task.toObject();
    delete newTaskData._id;
    delete newTaskData.__v;

    const newTask = new Task({
      ...newTaskData,
      assignedDate: now,
      createdAt: now,
      dueDate: newDueDate,
      nextDueDate: nextDueDate,
      nextRepetitionDate: nextDueDate,
      status: "To Do",
      repetitionCount: (task.repetitionCount || 1) + 1,
    });

    await newTask.save();

    // Update original task for the next cycle
    task.nextRepetitionDate = nextDueDate;
    task.repetitionCount = (task.repetitionCount || 1) + 1;
    await task.save();

    console.log(
      `✅ Created new repetition of task ${task._id} for ${newDueDate.toDateString()}`
    );
  } else {
    console.log(
      `⏭️ Skipped task ${task._id} due to future nextDate: ${newDueDate}`
    );
  }
}

  } catch (error) {
    console.error("Error in scheduleTaskRepeats:", error);
  }
};

// function getNextDueDate(task, offset = 1) {
//   const current = new Date(task.dueDate);
//   const day = task.repeatDay || current.getDate();

//   switch (task.repeatType) {
//     case "Daily":
//       return new Date(current.getFullYear(), current.getMonth(), current.getDate() + offset);
//     case "Monthly":
//       return new Date(current.getFullYear(), current.getMonth() + offset, day);
//     case "Quarterly":
//       return new Date(current.getFullYear(), current.getMonth() + offset * 3, day);
//     case "Every 6 Months":
//       return new Date(current.getFullYear(), current.getMonth() + offset * 6, day);
//     case "Annually":
//       const month = task.repeatMonth || current.getMonth();
//       return new Date(current.getFullYear() + offset, month, day);
//     default:
//       return current;
//   }
// }

// ⏰ Run daily at 11:00 AM (server time)
cron.schedule("0 9 * * *", scheduleTaskRepeats); // 9:00 AM server time

module.exports = scheduleTaskRepeats;
