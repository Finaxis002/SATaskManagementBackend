function getNextRepetitionDate(baseDate, repeatType, repeatDay, repeatMonth) {
  const date = new Date(baseDate);
  switch (repeatType) {
    case "Daily":
      date.setDate(date.getDate() + 1);
      break;
    case "Monthly":
      date.setMonth(date.getMonth() + 1);
      if (repeatDay) date.setDate(repeatDay);
      break;
    case "Quarterly":
      date.setMonth(date.getMonth() + 3);
      if (repeatDay) date.setDate(repeatDay);
      break;
    case "Every 6 Months":
      date.setMonth(date.getMonth() + 6);
      if (repeatDay) date.setDate(repeatDay);
      break;
    case "Annually":
      date.setFullYear(date.getFullYear() + 1);
      if (repeatMonth) date.setMonth(repeatMonth - 1);
      if (repeatDay) date.setDate(repeatDay);
      break;
  }
  return date;
}


module.exports = getNextRepetitionDate;