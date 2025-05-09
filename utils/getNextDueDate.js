module.exports = function getNextDueDate(task, offset = 1) {
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
};
