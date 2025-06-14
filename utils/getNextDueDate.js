// utils/getNextDueDate.js
function getNextDueDate(task, repetitionCount = 1) {
  if (!task.dueDate) return null;
  
  const dueDate = new Date(task.dueDate);
  if (isNaN(dueDate.getTime())) return null; // Invalid date check

  switch (task.repeatType) {
    case "Daily":
      dueDate.setDate(dueDate.getDate() + repetitionCount);
      break;
    case "Monthly":
      dueDate.setMonth(dueDate.getMonth() + repetitionCount);
      if (task.repeatDay) dueDate.setDate(task.repeatDay);
      break;
    case "Quarterly":
      dueDate.setMonth(dueDate.getMonth() + (3 * repetitionCount));
      if (task.repeatDay) dueDate.setDate(task.repeatDay);
      break;
    case "Every 6 Months":
      dueDate.setMonth(dueDate.getMonth() + (6 * repetitionCount));
      if (task.repeatDay) dueDate.setDate(task.repeatDay);
      break;
    case "Annually":
      dueDate.setFullYear(dueDate.getFullYear() + repetitionCount);
      if (task.repeatMonth) dueDate.setMonth(task.repeatMonth - 1);
      if (task.repeatDay) dueDate.setDate(task.repeatDay);
      break;
    default:
      return null;
  }

  return dueDate;
}
module.exports = getNextDueDate;