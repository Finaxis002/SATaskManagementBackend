const cron = require("node-cron");
const Task = require("../Models/Task");

function getNextDueDate(dueDate, repeatType) {
  const date = new Date(dueDate);

  switch (repeatType) {
    case "Daily":
      return new Date(date.setDate(date.getDate() + 1));
    case "Monthly":
      return new Date(date.setMonth(date.getMonth() + 1));
    case "Quarterly":
      return new Date(date.setMonth(date.getMonth() + 3));
    case "Every 6 Months":
      return new Date(date.setMonth(date.getMonth() + 6));
    case "Annually":
      return new Date(date.setFullYear(date.getFullYear() + 1));
    default:
      return date;
  }
}

const scheduleTaskRepeats = () => {
//     cron.schedule("* * * * *", async () => {
//     console.log("🔁 Cron job triggered to repeat tasks");

//     const today = new Date().toISOString().split("T")[0];

//     const dueTasks = await Task.find({
//       isRepetitive: true,
//       nextRepetitionDate: {
//         $lte: new Date(today + "T23:59:59Z"),
//       },
//     });

//     for (let task of dueTasks) {
//       const newDueDate = getNextDueDate(task.dueDate, task.repeatType);
//       const newNextRepetitionDate = getNextDueDate(task.nextRepetitionDate, task.repeatType);

//       const newTask = new Task({
//         ...task.toObject(),
//         _id: undefined, // Let Mongoose generate a new ID
//         createdAt: new Date(),
//         assignedDate: new Date(),
//         dueDate: newDueDate,
//         nextRepetitionDate: newNextRepetitionDate,
//       });

//       await newTask.save();
//       console.log(`✅ Repeated task: "${task.taskName}" for ${newDueDate.toDateString()}`);
//     }
//   });

cron.schedule("*/5 * * * *", async () => {
    console.log("⏱ Cron job triggered for 5-minute repetition");
  
    const now = new Date();
  
    const tasks = await Task.find({
      isRepetitive: true,
      repeatType: "Every 5 Minutes",
      nextRepetitionDate: { $lte: now },
    });
  
    for (let task of tasks) {
      const newCount = (task.repetitionCount || 1) + 1;
  
      const newTask = new Task({
        ...task.toObject(),
        _id: undefined,
        createdAt: new Date(),
        assignedDate: new Date(),
        dueDate: new Date(), // optional: use current time or offset
        nextRepetitionDate: new Date(Date.now() + 5 * 60 * 1000), // +5 minutes
        taskName: `${task.taskName.split(" (")[0]} (${newCount * 5} minutes)`,
        repetitionCount: newCount,
      });
  
      await newTask.save();
      console.log(`✅ Created repeated task: "${newTask.taskName}"`);
    }
  });
  

};

module.exports = scheduleTaskRepeats;
