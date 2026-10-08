// src/lib/filmStats.ts
// Turns tagged game-film events into a real box score.
//
// The tags the film tagger already collects line up almost exactly with the
// columns on the games table, but the two were never connected: a whole game
// of tagging was flattened into a style-match blob and the stat line thrown
// away. This is that bridge. Every number here comes from a tap the player
// made against a frame of their own video - nothing is inferred or predicted.
import { EMPTY_BOX, clampBox, type BoxScore } from '@/lib/games';

export interface FilmEvent {
  /** Seconds into the video */
  t: number;
  type: string;
}

/** Which box-score column each tag increments. Tags with no stat meaning
 *  (drive, pullup, iso, stop…) are style signals only and are absent here. */
const STAT_FOR_TAG: Record<string, Array<keyof BoxScore>> = {
  // A make is also an attempt, so it increments both columns
  rim_make: ['fgm2', 'fga2'],
  rim_miss: ['fga2'],
  mid_make: ['fgm2', 'fga2'],
  mid_miss: ['fga2'],
  three_make: ['fgm3', 'fga3'],
  three_miss: ['fga3'],
  ft_make: ['ftm', 'fta'],
  ft_miss: ['fta'],
  assist: ['ast'],
  turnover: ['tov'],
  off_rebound: ['oreb'],
  def_rebound: ['dreb'],
  steal: ['stl'],
  block: ['blk'],
  foul: ['pf'],
};

/** True when tagging this event changes the box score (rather than only the style profile). */
export function tagCountsToBoxScore(tagId: string): boolean {
  return tagId in STAT_FOR_TAG;
}

export function boxScoreFromFilm(events: Array<{ type: string }>): BoxScore {
  const box: BoxScore = { ...EMPTY_BOX };
  for (const e of events) {
    for (const stat of STAT_FOR_TAG[e.type] || []) box[stat] += 1;
  }
  // clampBox is belt and braces here - the counters above cannot produce a
  // make without its attempt - but it keeps one source of truth for validity.
  return clampBox(box);
}

/** How many of the tagged events contributed to the box score. */
export function statEventCount(events: Array<{ type: string }>): number {
  return events.filter((e) => tagCountsToBoxScore(e.type)).length;
}
