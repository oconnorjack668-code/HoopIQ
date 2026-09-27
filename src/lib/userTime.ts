// src/lib/userTime.ts
// SERVER-ONLY: the signed-in player's calendar. Uses the time zone they chose in Settings
// (or their phone reported), falling back to Ireland, so "today", streaks and the chat's
// daily limit follow their own midnight.
import { cache } from 'react';
import { getCurrentProfile } from '@/lib/auth';
import { appTimeZone, calendarNow, isValidTimeZone } from '@/lib/dates';

export const getUserTimeZone = cache(async (): Promise<string> => {
  const tz = (await getCurrentProfile())?.timezone;
  return tz && isValidTimeZone(tz) ? tz : appTimeZone();
});

export async function userCalendarNow(now: Date = new Date()) {
  return calendarNow(now, await getUserTimeZone());
}
