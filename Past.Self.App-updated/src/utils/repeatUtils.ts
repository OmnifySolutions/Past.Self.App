export function getNextRepeatDate(fromDate: Date, repeat: string): Date {
  const next = new Date(fromDate);
  switch (repeat) {
    case 'daily':
      next.setDate(next.getDate() + 1);
      break;
    case 'weekdays': {
      next.setDate(next.getDate() + 1);
      while (next.getDay() === 0 || next.getDay() === 6) {
        next.setDate(next.getDate() + 1);
      }
      break;
    }
    case 'weekends': {
      next.setDate(next.getDate() + 1);
      while (next.getDay() !== 0 && next.getDay() !== 6) {
        next.setDate(next.getDate() + 1);
      }
      break;
    }
    case 'weekly':
      next.setDate(next.getDate() + 7);
      break;
    case 'monthly':
      next.setMonth(next.getMonth() + 1);
      break;
    default:
      break;
  }
  return next;
}

export function getRepeatDescription(date: Date, repeat: string): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const day = days[date.getDay()];
  const dateNum = date.getDate();
  const suffix = dateNum === 1 ? 'st' : dateNum === 2 ? 'nd' : dateNum === 3 ? 'rd' : 'th';

  switch (repeat) {
    case 'daily': return `Every day at ${timeStr}`;
    case 'weekdays': return `Every weekday (Mon–Fri) at ${timeStr}`;
    case 'weekends': return `Every weekend at ${timeStr}`;
    case 'weekly': return `Every ${day} at ${timeStr}`;
    case 'monthly': return `Every ${dateNum}${suffix} of the month at ${timeStr}`;
    default: return '';
  }
}

export function getNextOccurrence(scheduledFor: string, repeat: string): Date | null {
  if (!repeat || repeat === 'never') return null;
  const base = new Date(scheduledFor);
  const now = new Date();
  let next = new Date(base);
  // Advance until we find a future date
  let safety = 0;
  while (next <= now && safety < 400) {
    next = getNextRepeatDate(next, repeat);
    safety++;
  }
  return next;
}
