
module.exports = function getNextDueDate(task, offset = 1) {
  const baseDate = new Date(); // ✅ Use today's date

  const day = task.repeatDay || baseDate.getDate();

  switch (task.repeatType) {
    case "Daily":
      return new Date(
        baseDate.getFullYear(),
        baseDate.getMonth(),
        baseDate.getDate() + offset
      );
    case "Monthly":
      return new Date(baseDate.getFullYear(), baseDate.getMonth() + offset, day);
    case "Quarterly":
      return new Date(baseDate.getFullYear(), baseDate.getMonth() + offset * 3, day);
    case "Every 6 Months":
      return new Date(baseDate.getFullYear(), baseDate.getMonth() + offset * 6, day);
    case "Annually":
      const month = task.repeatMonth || baseDate.getMonth();
      return new Date(baseDate.getFullYear() + offset, month, day);
    default:
      return baseDate;
  }
};
