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
  cron.schedule("0 0 * * *", async () => {
    console.log("🔁 Cron job triggered to repeat tasks");

    const today = new Date().toISOString().split("T")[0];

    const dueTasks = await Task.find({
      isRepetitive: true,
      nextRepetitionDate: {
        $lte: new Date(today + "T23:59:59Z"),
      },
    });

    for (let task of dueTasks) {
      const newDueDate = getNextDueDate(task.dueDate, task.repeatType);
      const newNextRepetitionDate = getNextDueDate(task.nextRepetitionDate, task.repeatType);

      const newTask = new Task({
        ...task.toObject(),
        _id: undefined, // Let Mongoose generate a new ID
        createdAt: new Date(),
        assignedDate: new Date(),
        dueDate: newDueDate,
        nextRepetitionDate: newNextRepetitionDate,
      });

      await newTask.save();
      console.log(`✅ Repeated task: "${task.taskName}" for ${newDueDate.toDateString()}`);
    }
  });
};

module.exports = scheduleTaskRepeats;
