// __tests__/dates.test.ts
import { describe, it, expect } from 'vitest';
import { addDays, calendarNow, dateInTimeZone, fromDateColumn, startOfDayIso, weekStart } from '@/lib/dates';

describe('fromDateColumn', () => {
  it('lands on local midnight, not UTC midnight', () => {
    // The whole point: new Date('2026-10-08') is UTC midnight, which is the
    // 7th for anyone west of Greenwich. This must equal the local 8th.
    expect(fromDateColumn('2026-10-08').getTime()).toBe(new Date(2026, 9, 8).getTime());
  });

  it('keeps the calendar day the column actually says', () => {
    const d = fromDateColumn('2026-01-01');
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(0);
    expect(d.getDate()).toBe(1);
  });

  it('round-trips a date through rendering without shifting', () => {
    for (const s of ['2026-01-01', '2026-06-15', '2026-10-08', '2026-12-31']) {
      const [y, m, d] = s.split('-').map(Number);
      const parsed = fromDateColumn(s);
      expect(parsed.getFullYear(), s).toBe(y);
      expect(parsed.getMonth() + 1, s).toBe(m);
      expect(parsed.getDate(), s).toBe(d);
    }
  });
});

describe('calendar helpers (players are in Ireland, servers run on UTC)', () => {
  it('uses the Irish date just after midnight in summer (UTC is still yesterday)', () => {
    // 23:30 UTC on Sunday 20 Sept = 00:30 Monday 21 Sept in Dublin (IST, UTC+1)
    const now = new Date('2026-09-20T23:30:00Z');
    expect(dateInTimeZone(now, 'Europe/Dublin')).toBe('2026-09-21');
    const c = calendarNow(now, 'Europe/Dublin');
    expect(c.today).toBe('2026-09-21');
    expect(c.weekStart).toBe('2026-09-21'); // it's already Monday in Ireland
    expect(c.weekStartIso).toBe('2026-09-20T23:00:00.000Z');
    expect(c.todayStartIso).toBe('2026-09-20T23:00:00.000Z');
  });

  it('winter time: Dublin is on UTC', () => {
    const c = calendarNow(new Date('2026-12-02T10:00:00Z'), 'Europe/Dublin');
    expect(c.today).toBe('2026-12-02');
    expect(c.weekStart).toBe('2026-11-30');
    expect(c.weekStartIso).toBe('2026-11-30T00:00:00.000Z');
  });

  it('handles the clock-change days', () => {
    // Clocks go forward at 01:00 UTC on 29 March 2026 and back at 01:00 UTC on 25 October 2026
    expect(startOfDayIso('2026-03-29', 'Europe/Dublin')).toBe('2026-03-29T00:00:00.000Z');
    expect(startOfDayIso('2026-03-30', 'Europe/Dublin')).toBe('2026-03-29T23:00:00.000Z');
    expect(startOfDayIso('2026-10-25', 'Europe/Dublin')).toBe('2026-10-24T23:00:00.000Z');
    expect(startOfDayIso('2026-10-26', 'Europe/Dublin')).toBe('2026-10-26T00:00:00.000Z');
  });

  it('adds days across month/year ends and finds Monday', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(weekStart('2026-09-27')).toBe('2026-09-21'); // Sunday -> previous Monday
    expect(weekStart('2026-09-21')).toBe('2026-09-21'); // Monday stays
  });
});
