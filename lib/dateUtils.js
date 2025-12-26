export function buildLocalMorningDate(
  dateString,
  hour = 8,
  minute = 0
) {
  const parts = dateString.split('/').map(Number);

  let day, month, year;

  if (parts[0] > 12) {
    [day, month, year] = parts;
  } else {
    [month, day, year] = parts;
  }

  return new Date(year, month - 1, day, hour, minute, 0, 0);
}

export function isSameLocalDay(dateA, dateB) {
  return (
    dateA.getFullYear() === dateB.getFullYear() &&
    dateA.getMonth() === dateB.getMonth() &&
    dateA.getDate() === dateB.getDate()
  );
}
