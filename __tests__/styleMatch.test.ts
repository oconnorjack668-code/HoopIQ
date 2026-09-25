// __tests__/styleMatch.test.ts
import { describe, it, expect } from 'vitest';
import { findMatches, scorePlayer, shotProfileFromZones, styleFromFilm, type NbaPlayer } from '@/lib/styleMatch';

const player = (slug: string, position: string, height_cm: number, style_tags: string[], shot_profile = { rim: 0.33, mid: 0.33, three: 0.34 }): NbaPlayer => ({
  slug,
  name: slug,
  era: 'modern',
  position,
  height_cm,
  archetype: 'x',
  style_tags,
  shot_profile,
  strengths: [],
  signature_moves: [],
  how_to_copy: [],
  drill_skills: [],
});

const PLAYERS = [
  player('small-shooter', 'PG', 185, ['spot_up_shooter', 'movement_shooter', 'pick_and_roll_handler'], { rim: 0.2, mid: 0.1, three: 0.7 }),
  player('small-slasher', 'PG', 183, ['slasher', 'transition_threat'], { rim: 0.6, mid: 0.3, three: 0.1 }),
  player('big-shooter', 'C', 213, ['spot_up_shooter', 'stretch_big'], { rim: 0.3, mid: 0.1, three: 0.6 }),
  player('big-post', 'C', 216, ['post_scorer', 'rim_protector', 'rebounder'], { rim: 0.7, mid: 0.28, three: 0.02 }),
];

describe('style match', () => {
  it('weights height: a 5\'11" shooter matches the small shooter, not the 7-foot shooter', () => {
    const [top] = findMatches(
      { heightCm: 180, position: 'PG', styleTags: ['spot_up_shooter', 'movement_shooter'], shotProfile: null },
      PLAYERS
    );
    expect(top.player.slug).toBe('small-shooter');
  });

  it('uses play style to separate players of similar height', () => {
    const [top] = findMatches({ heightCm: 184, position: 'PG', styleTags: ['slasher', 'transition_threat'], shotProfile: null }, PLAYERS);
    expect(top.player.slug).toBe('small-slasher');
  });

  it('uses logged shot locations when there are enough shots', () => {
    const profile = shotProfileFromZones([
      { shot_zone: 'paint', attempts: 40 },
      { shot_zone: 'mid-center', attempts: 15 },
      { shot_zone: 'three-top', attempts: 5 },
    ]);
    expect(profile).not.toBeNull();
    const [top] = findMatches({ heightCm: 214, position: 'C', styleTags: [], shotProfile: profile }, PLAYERS);
    expect(top.player.slug).toBe('big-post');
  });

  it('ignores shot data below the minimum sample', () => {
    expect(shotProfileFromZones([{ shot_zone: 'paint', attempts: 5 }])).toBeNull();
  });

  it('scores 0-100 and reports the height difference and shared tags', () => {
    const m = scorePlayer({ heightCm: 185, position: 'PG', styleTags: ['spot_up_shooter'], shotProfile: null }, PLAYERS[0]);
    expect(m.score).toBeGreaterThan(90);
    expect(m.score).toBeLessThanOrEqual(100);
    expect(m.heightDiffCm).toBe(0);
    expect(m.sharedTags).toEqual(['spot_up_shooter']);
  });
});

describe('game film tagging', () => {
  const tags = (type: string, n: number) => Array.from({ length: n }, () => ({ type }));

  it('turns frequent plays into style tags, most frequent first', () => {
    const { styleTags } = styleFromFilm([...tags('drive', 6), ...tags('assist', 3), ...tags('post_up', 1), ...tags('transition', 2)]);
    expect(styleTags).toEqual(['slasher', 'playmaker', 'transition_threat']);
  });

  it('marks players busy on both ends as two-way', () => {
    const { styleTags } = styleFromFilm([...tags('drive', 3), ...tags('pullup', 2), ...tags('steal', 3), ...tags('stop', 3)]);
    expect(styleTags).toContain('two_way');
  });

  it('builds a shot profile once there are enough tagged shots', () => {
    expect(styleFromFilm([...tags('three_make', 2), ...tags('rim_make', 2)]).shotProfile).toBeNull();
    const film = styleFromFilm([...tags('three_make', 3), ...tags('three_miss', 3), ...tags('rim_make', 2), ...tags('mid_miss', 2)]);
    expect(film.shots).toBe(10);
    expect(film.shotProfile).toEqual({ rim: 0.2, mid: 0.2, three: 0.6 });
  });
});
