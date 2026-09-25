// src/lib/reminders.ts
// Decides whether a player should get a training reminder right now, in their timezone.

export interface ReminderPrefs {
  reminder_enabled: boolean;
  push_enabled: boolean;
  reminder_days: number[]; // 0 = Sunday ... 6 = Saturday
  reminder_time: string; // 'HH:MM' or 'HH:MM:SS'
  timezone: string;
  last_reminded_on: string | null; // YYYY-MM-DD (local)
}

/** Local date (YYYY-MM-DD), weekday (0-6) and hour in a timezone. Falls back to UTC for unknown zones. */
export function localParts(now: Date, timeZone: string): { date: string; weekday: number; hour: number } {
  let zone = timeZone;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: zone });
  } catch {
    zone = 'UTC';
  }
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: zone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      weekday: 'short',
      hour: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(now)
      .map((p) => [p.type, p.value])
  );
  const weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(parts.weekday);
  return { date: `${parts.year}-${parts.month}-${parts.day}`, weekday, hour: Number(parts.hour) };
}

/**
 * A reminder is due on a chosen day, at or after the chosen hour, at most once a day.
 * "At or after" means a once-a-day scheduler still delivers it (just later).
 */
export function reminderDue(prefs: ReminderPrefs, now: Date): { due: boolean; localDate: string } {
  const { date, weekday, hour } = localParts(now, prefs.timezone);
  const reminderHour = Number(prefs.reminder_time.split(':')[0]);
  const due =
    prefs.reminder_enabled &&
    prefs.push_enabled &&
    prefs.reminder_days.includes(weekday) &&
    hour >= reminderHour &&
    prefs.last_reminded_on !== date;
  return { due, localDate: date };
}
