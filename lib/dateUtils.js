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

/**
 * Compute the next occurrence for a repeating event according to the rules in
 * docs/reminder_feature.md (6.9 Repeat Interval Rules):
 *  - daily  -> +1 day
 *  - weekly -> +7 days
 *  - monthly -> same date next month (cap to last day of month)
 *  - yearly -> same date next year
 *
 * This function advances the provided date by a single repeat interval and
 * returns a new Date instance. It does NOT loop to ensure the result is in the
 * future — callers may advance repeatedly if they need the next future
 * occurrence.
 */
export function computeNextOccurrence(baseDate, repeatVal) {
  if (!repeatVal || repeatVal === 'none') return new Date(baseDate.getTime());

  const next = new Date(baseDate.getTime());

  if (repeatVal === 'daily') {
    next.setDate(next.getDate() + 1);
  } else if (repeatVal === 'weekly') {
    next.setDate(next.getDate() + 7);
  } else if (repeatVal === 'monthly') {
    // Preserve the day-of-month where possible. If the next month doesn't have
    // the same day, cap to the month's last day (e.g., Jan 31 -> Feb 28/29).
    const day = next.getDate();
    next.setMonth(next.getMonth() + 1);
    const lastDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
    next.setDate(Math.min(day, lastDay));
  } else if (repeatVal === 'yearly') {
    next.setFullYear(next.getFullYear() + 1);
  }

  return next;
}

export function isSameLocalDay(dateA, dateB) {
  return (
    dateA.getFullYear() === dateB.getFullYear() &&
    dateA.getMonth() === dateB.getMonth() &&
    dateA.getDate() === dateB.getDate()
  );
}
