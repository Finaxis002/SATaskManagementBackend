// const cron = require("node-cron");
// const Task = require("../Models/Task");
// const getNextDueDate = require("../utils/getNextDueDate");

// const scheduleTaskRepeats = async () => {
//   try {
//     const now = new Date();
//     const today = new Date(now.setHours(0, 0, 0, 0));

//     // Find all repetitive tasks that need their next occurrence created
//     const tasks = await Task.find({
//       isRepetitive: true,
//       $or: [
//         { nextRepetitionDate: { $lte: today } },
//         { nextRepetitionDate: { $exists: false } },
//       ],
//     });

//     console.log(
//       `[${now.toISOString()}] Found ${
//         tasks.length
//       } repetitive tasks to process.`
//     );

//     for (const task of tasks) {
//       // Calculate dates based on repeatType
//       const newRepetitionDate = task.nextRepetitionDate 
//         ? getNextDueDate(task, 0, task.nextRepetitionDate)
//         : getNextDueDate(task, 0, task.createdAt);
      
//       const newDueDate = getNextDueDate(task, 0);

//       // Only create new task if we've reached the repetition date
//       if (!task.nextRepetitionDate || task.nextRepetitionDate <= today) {
//         const newTaskData = task.toObject();
//         delete newTaskData._id;
//         delete newTaskData.__v;

//         const newTask = new Task({
//           ...newTaskData,
//           assignedDate: new Date(today), // Use today's date as assigned date
//           createdAt: new Date(today),
//           dueDate: newDueDate,
//           nextRepetitionDate: newRepetitionDate,
//           nextDueDate: getNextDueDate(task, 0, newDueDate),
//           status: "To Do",
//           repetitionCount: (task.repetitionCount || 0) + 1,
//         });

//         await newTask.save();

//         // Update original task's nextRepetitionDate and nextDueDate
//         task.nextRepetitionDate = newRepetitionDate;
//         task.nextDueDate = newDueDate;
//         task.repetitionCount = (task.repetitionCount || 0) + 1;
//         await task.save();

//         console.log(
//           `✅ Created new task from ${
//             task._id
//           } with due date ${newDueDate.toDateString()}`
//         );
//       } else {
//         console.log(
//           `⏭️ Skipped: ${task._id} – next repetition date ${task.nextRepetitionDate.toDateString()} not reached yet`
//         );
//       }
//     }
//   } catch (error) {
//     console.error("Error in scheduleTaskRepeats:", error);
//   }
// };

// // Run daily at midnight
// cron.schedule("0 0 * * *", scheduleTaskRepeats);

// module.exports = scheduleTaskRepeats;










const cron = require("node-cron");
const Task = require("../Models/Task");
const {
  getNextDueDate,
  getNextRepetitionDate,
} = require("../utils/dateUtils");

const scheduleTaskRepeats = async () => {
  try {
    const now = new Date();
    const today = new Date(now.setHours(0, 0, 0, 0));

    const tasks = await Task.find({
      isRepetitive: true,
      $or: [
        { nextRepetitionDate: { $lte: today } },
        { nextRepetitionDate: { $exists: false } },
      ],
    });

    console.log(`[${now.toISOString()}] Found ${tasks.length} repetitive tasks to process.`);

   for (const task of tasks) {
  const lastAssignedDate = task.nextRepetitionDate || task.createdAt;
  const lastDueDate = task.dueDate;

  if (!task.nextRepetitionDate || task.nextRepetitionDate <= today) {
    // Calculate new repetition dates (only +1 step forward)
    const newAssignedDate = getNextRepetitionDate(
      lastAssignedDate,
      task.repeatType,
      task.repeatDay,
      task.repeatMonth
    );

    const newDueDate = getNextDueDate(
      lastDueDate,
      task.repeatType
    );

    const nextRepetitionDate = getNextRepetitionDate(
      newAssignedDate,
      task.repeatType,
      task.repeatDay,
      task.repeatMonth
    );

    const nextDueDate = getNextDueDate(
      newDueDate,
      task.repeatType
    );

    const newTaskData = task.toObject();
    delete newTaskData._id;
    delete newTaskData.__v;

    const newTask = new Task({
      ...newTaskData,
      assignedDate: newAssignedDate,
      createdAt: newAssignedDate,
      dueDate: newDueDate,
      nextRepetitionDate,
      nextDueDate,
      repetitionCount: (task.repetitionCount || 0) + 1,
      status: "To Do",
      isHidden: false, // Optional: explicitly show it
    });

    await newTask.save();

    // Update original task for the next repetition cycle
    task.nextRepetitionDate = nextRepetitionDate;
    task.nextDueDate = nextDueDate;
    task.repetitionCount = newTask.repetitionCount;
    await task.save();

    console.log(`✅ Created new task from ${task._id} on ${newAssignedDate.toDateString()}`);
  } else {
    console.log(
      `⏭️ Skipped: ${task._id} – next repetition date ${task.nextRepetitionDate.toDateString()} not reached yet`
    );
  }
}

  } catch (error) {
    console.error("Error in scheduleTaskRepeats:", error);
  }
};

// Run daily at midnight
cron.schedule("0 0 * * *", scheduleTaskRepeats);

module.exports = scheduleTaskRepeats;
