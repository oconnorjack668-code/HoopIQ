// src/lib/dates.ts
// Calendar helpers. Training dates are stored as plain local dates ("YYYY-MM-DD"), so "today" and
// "this week" must be worked out in the player's time zone, not the server's. Servers (Vercel)
// run on UTC, which is an hour behind Ireland in summer: between midnight and 1am a session
// logged "today" would otherwise count as tomorrow's and the streak / week would look wrong.

/** Time zone used for server-side "today" (players are in Ireland). Override with APP_TIME_ZONE. */
export const DEFAULT_TIME_ZONE = 'Europe/Dublin';

export function appTimeZone(): string {
  const configured = typeof process !== 'undefined' ? process.env.APP_TIME_ZONE : undefined;
  return configured && isValidTimeZone(configured) ? configured : DEFAULT_TIME_ZONE;
}

export function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone });
    return true;
  } catch {
    return false;
  }
}

const pad = (n: number) => String(n).padStart(2, '0');

/** "YYYY-MM-DD" on this device's own calendar (use in the browser). */
export function localDateString(d: Date = new Date()): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const formatters = new Map<string, Intl.DateTimeFormat>();
function partsIn(d: Date, timeZone: string) {
  let f = formatters.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    });
    formatters.set(timeZone, f);
  }
  const p: Record<string, number> = {};
  for (const { type, value } of f.formatToParts(d)) if (type !== 'literal') p[type] = Number(value);
  return p as { year: number; month: number; day: number; hour: number; minute: number; second: number };
}

/** "YYYY-MM-DD" for the given instant in a time zone (default: the app's). */
export function dateInTimeZone(d: Date = new Date(), timeZone: string = appTimeZone()): string {
  const p = partsIn(d, timeZone);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}

/** Adds whole days to a "YYYY-MM-DD" date (pure calendar maths, no time zone involved). */
export function addDays(date: string, days: number): string {
  const ms = Date.parse(`${date}T00:00:00Z`) + days * 86_400_000;
  return new Date(ms).toISOString().slice(0, 10);
}

/** Monday of the week containing the date (weeks run Monday–Sunday). */
export function weekStart(date: string): string {
  const weekday = new Date(`${date}T00:00:00Z`).getUTCDay(); // 0 = Sunday
  return addDays(date, -((weekday + 6) % 7));
}

/** The UTC instant (ISO string) when the given calendar date starts in a time zone. */
export function startOfDayIso(date: string, timeZone: string = appTimeZone()): string {
  const guess = Date.parse(`${date}T00:00:00Z`);
  const offsetAt = (ms: number) => {
    const p = partsIn(new Date(ms), timeZone);
    return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - ms;
  };
  let ms = guess - offsetAt(guess);
  // Re-check in case a clock change falls between the guess and the answer
  ms = guess - offsetAt(ms);
  return new Date(ms).toISOString();
}

/** Today, this week's Monday and the instant this week started, all in the app's time zone. */
export function calendarNow(now: Date = new Date(), timeZone: string = appTimeZone()) {
  const today = dateInTimeZone(now, timeZone);
  const monday = weekStart(today);
  return { today, weekStart: monday, weekStartIso: startOfDayIso(monday, timeZone), todayStartIso: startOfDayIso(today, timeZone) };
}
