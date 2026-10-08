import { describe, it, expect } from 'vitest';
import { boxScoreFromFilm, statEventCount, tagCountsToBoxScore } from '@/lib/filmStats';
import { points, COUNTING_STATS } from '@/lib/games';
import { FILM_TAGS } from '@/lib/styleMatch';

const tags = (type: string, n: number) => Array.from({ length: n }, () => ({ type }));

describe('boxScoreFromFilm', () => {
  it('counts a make as both a make and an attempt', () => {
    const box = boxScoreFromFilm(tags('three_make', 3));
    expect(box.fgm3).toBe(3);
    expect(box.fga3).toBe(3);
  });

  it('counts a miss as an attempt only', () => {
    const box = boxScoreFromFilm(tags('three_miss', 4));
    expect(box.fgm3).toBe(0);
    expect(box.fga3).toBe(4);
  });

  it('folds rim and mid shots into the same two-point columns', () => {
    const box = boxScoreFromFilm([...tags('rim_make', 2), ...tags('mid_make', 1), ...tags('rim_miss', 3)]);
    expect(box.fgm2).toBe(3);
    expect(box.fga2).toBe(6);
  });

  it('keeps offensive and defensive rebounds apart', () => {
    const box = boxScoreFromFilm([...tags('off_rebound', 2), ...tags('def_rebound', 5)]);
    expect(box.oreb).toBe(2);
    expect(box.dreb).toBe(5);
  });

  it('derives points from the shooting columns', () => {
    // 4 twos, 2 threes, 3 free throws = 8 + 6 + 3 = 17
    const box = boxScoreFromFilm([...tags('rim_make', 4), ...tags('three_make', 2), ...tags('ft_make', 3)]);
    expect(points(box)).toBe(17);
  });

  it('ignores style-only tags', () => {
    const box = boxScoreFromFilm([...tags('drive', 5), ...tags('pullup', 3), ...tags('stop', 4), ...tags('iso', 2)]);
    for (const stat of COUNTING_STATS) expect(box[stat]).toBe(0);
  });

  it('returns an all-zero box score for no events', () => {
    const box = boxScoreFromFilm([]);
    for (const stat of COUNTING_STATS) expect(box[stat]).toBe(0);
    expect(points(box)).toBe(0);
  });

  it('never reports more makes than attempts', () => {
    const box = boxScoreFromFilm([...tags('ft_make', 6), ...tags('ft_miss', 2)]);
    expect(box.ftm).toBe(6);
    expect(box.fta).toBe(8);
    expect(box.fta).toBeGreaterThanOrEqual(box.ftm);
  });

  it('counts only the events that affect the box score', () => {
    const events = [...tags('three_make', 2), ...tags('drive', 5), ...tags('assist', 1)];
    expect(statEventCount(events)).toBe(3);
  });

  it('every stat-bearing tag id is a real film tag', () => {
    // Guards against a typo in STAT_FOR_TAG silently dropping a stat
    const ids = new Set<string>(FILM_TAGS.map((t) => t.id));
    const statTags = FILM_TAGS.filter((t) => tagCountsToBoxScore(t.id)).map((t) => t.id);
    expect(statTags.length).toBeGreaterThan(0);
    for (const id of statTags) expect(ids.has(id)).toBe(true);
  });

  it('covers every shot tag so no shot can be tagged without reaching the box score', () => {
    const shotTags = FILM_TAGS.filter((t) => t.group === 'shot').map((t) => t.id);
    for (const id of shotTags) expect(tagCountsToBoxScore(id)).toBe(true);
  });
});
