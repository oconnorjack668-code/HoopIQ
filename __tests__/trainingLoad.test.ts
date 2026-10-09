import { describe, it, expect } from 'vitest';
import { trainingLoad } from '@/lib/trainingLoad';
import { addDays } from '@/lib/dates';

const TODAY = '2026-10-09';
/** n days ago, as a date string */
const ago = (n: number) => addDays(TODAY, -n);

describe('trainingLoad', () => {
  it('counts distinct days in each seven-day window', () => {
    const days = [ago(0), ago(2), ago(5), ago(8), ago(10)];
    const load = trainingLoad(days, TODAY);
    expect(load.last7).toBe(3);
    expect(load.prev7).toBe(2);
  });

  it('does not double-count two sessions on the same day', () => {
    const load = trainingLoad([ago(1), ago(1), ago(1)], TODAY);
    expect(load.last7).toBe(1);
  });

  it('ignores anything older than fourteen days', () => {
    const load = trainingLoad([ago(14), ago(30), ago(400)], TODAY);
    expect(load.last7).toBe(0);
    expect(load.prev7).toBe(0);
  });

  it('includes today and the full seventh day back', () => {
    expect(trainingLoad([ago(0)], TODAY).last7).toBe(1);
    expect(trainingLoad([ago(6)], TODAY).last7).toBe(1);
    // Day 7 belongs to the previous window, not this one
    expect(trainingLoad([ago(7)], TODAY).last7).toBe(0);
    expect(trainingLoad([ago(7)], TODAY).prev7).toBe(1);
    expect(trainingLoad([ago(13)], TODAY).prev7).toBe(1);
  });

  it('advises rest rather than cheering when the week has been heavy', () => {
    const days = [ago(0), ago(1), ago(2), ago(3), ago(4), ago(5)];
    const load = trainingLoad(days, TODAY);
    expect(load.status).toBe('heavy');
    expect(load.message).toMatch(/rest day/i);
  });

  it('spots a building week', () => {
    const load = trainingLoad([ago(0), ago(2), ago(4), ago(9)], TODAY);
    expect(load.status).toBe('building');
    expect(load.message).toContain('3');
  });

  it('spots an easing week and nudges', () => {
    const load = trainingLoad([ago(1), ago(8), ago(9), ago(10)], TODAY);
    expect(load.status).toBe('easing');
    expect(load.message).toMatch(/one more/i);
  });

  it('recognises steady weeks', () => {
    const load = trainingLoad([ago(1), ago(3), ago(8), ago(10)], TODAY);
    expect(load.status).toBe('steady');
  });

  it('says something useful to a player who has never trained', () => {
    const load = trainingLoad([], TODAY);
    expect(load.status).toBe('none');
    expect(load.last7).toBe(0);
    expect(load.message).toMatch(/fifteen minutes/i);
  });

  it('distinguishes a lapsed player from a brand-new one', () => {
    const lapsed = trainingLoad([ago(8), ago(10)], TODAY);
    expect(lapsed.status).toBe('none');
    expect(lapsed.message).toMatch(/going again/i);
  });

  it('always produces a message', () => {
    for (const days of [[], [ago(0)], [ago(0), ago(1), ago(2), ago(3), ago(4), ago(5), ago(6)]]) {
      expect(trainingLoad(days, TODAY).message.length).toBeGreaterThan(0);
    }
  });
});
