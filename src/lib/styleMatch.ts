// src/lib/styleMatch.ts
// Play Style Match: scores NBA player profiles against a HoopIQ player.

export const STYLE_TAGS: Array<{ id: string; label: string }> = [
  { id: 'pick_and_roll_handler', label: 'I run pick-and-roll with the ball' },
  { id: 'isolation_scorer', label: 'I like to go one-on-one' },
  { id: 'spot_up_shooter', label: 'I spot up and shoot off the catch' },
  { id: 'movement_shooter', label: 'I shoot coming off screens and on the move' },
  { id: 'slasher', label: 'I attack the rim off the dribble' },
  { id: 'mid_range_scorer', label: 'I love the mid-range pull-up' },
  { id: 'post_scorer', label: 'I score with my back to the basket' },
  { id: 'playmaker', label: 'I create shots for teammates' },
  { id: 'floor_general', label: 'I run the offense and call plays' },
  { id: 'transition_threat', label: 'I push the pace in transition' },
  { id: 'lob_threat', label: 'I finish lobs and dunks above the rim' },
  { id: 'rebounder', label: 'I crash the boards' },
  { id: 'rim_protector', label: 'I block and change shots at the rim' },
  { id: 'perimeter_defender', label: 'I lock down wings on defense' },
  { id: 'point_of_attack_defender', label: 'I pressure the ball handler' },
  { id: 'two_way', label: 'I play hard on both ends' },
  { id: 'stretch_big', label: "I'm a big who shoots from outside" },
  { id: 'connector', label: 'I make the simple pass and keep the ball moving' },
];

export interface ShotProfile {
  rim: number;
  mid: number;
  three: number;
}

export interface NbaPlayer {
  slug: string;
  name: string;
  era: string;
  position: string;
  height_cm: number;
  archetype: string;
  style_tags: string[];
  shot_profile: ShotProfile;
  strengths: string[];
  signature_moves: string[];
  how_to_copy: string[];
  drill_skills: string[];
}

export interface MatchInput {
  heightCm: number;
  position: string | null; // profile position: PG, SG, SF, PF, C, G, F, multi
  styleTags: string[];
  shotProfile: ShotProfile | null; // null when there aren't enough logged shots
}

export interface Match {
  player: NbaPlayer;
  score: number; // 0-100
  heightDiffCm: number;
  sharedTags: string[];
}

const WEIGHTS = { height: 0.35, style: 0.3, shots: 0.2, position: 0.15 };
const HEIGHT_SIGMA_CM = 7;
export const MIN_SHOTS_FOR_PROFILE = 30;

type Family = 'guard' | 'wing' | 'big';

function familyOf(position: string | null): Family | null {
  switch (position) {
    case 'PG':
    case 'SG':
    case 'G':
      return 'guard';
    case 'SF':
    case 'F':
      return 'wing';
    case 'PF':
    case 'C':
      return 'big';
    default:
      return null; // 'multi' or unknown
  }
}

function positionScore(user: string | null, nba: string): number | null {
  const u = familyOf(user);
  if (!u) return null;
  const n = familyOf(nba)!;
  if (u === n) return 1;
  return u === 'wing' || n === 'wing' ? 0.5 : 0;
}

/** Converts HoopIQ zone totals into rim / mid / three shares of attempts. */
export function shotProfileFromZones(rows: Array<{ shot_zone: string; attempts: number }>): ShotProfile | null {
  let rim = 0;
  let mid = 0;
  let three = 0;
  for (const r of rows) {
    if (r.shot_zone === 'paint') rim += r.attempts;
    else if (r.shot_zone.startsWith('three') || r.shot_zone === 'deep-three') three += r.attempts;
    else if (r.shot_zone === 'free-throw' || r.shot_zone.startsWith('mid')) mid += r.attempts;
  }
  const total = rim + mid + three;
  if (total < MIN_SHOTS_FOR_PROFILE) return null;
  return { rim: rim / total, mid: mid / total, three: three / total };
}

export function scorePlayer(input: MatchInput, p: NbaPlayer): Match {
  const parts: Array<[number, number]> = [];
  const heightDiffCm = input.heightCm - p.height_cm;
  parts.push([WEIGHTS.height, Math.exp(-(heightDiffCm ** 2) / (2 * HEIGHT_SIGMA_CM ** 2))]);

  const sharedTags = input.styleTags.filter((t) => p.style_tags.includes(t));
  if (input.styleTags.length > 0) {
    parts.push([WEIGHTS.style, sharedTags.length / Math.min(input.styleTags.length, Math.max(p.style_tags.length, 1))]);
  }

  if (input.shotProfile) {
    const s = input.shotProfile;
    const q = p.shot_profile;
    const distance = Math.abs(s.rim - q.rim) + Math.abs(s.mid - q.mid) + Math.abs(s.three - q.three);
    parts.push([WEIGHTS.shots, 1 - distance / 2]);
  }

  const pos = positionScore(input.position, p.position);
  if (pos !== null) parts.push([WEIGHTS.position, pos]);

  const totalWeight = parts.reduce((n, [w]) => n + w, 0);
  const score = parts.reduce((n, [w, v]) => n + w * Math.min(1, Math.max(0, v)), 0) / totalWeight;
  return { player: p, score: Math.round(score * 100), heightDiffCm, sharedTags };
}

export function findMatches(input: MatchInput, players: NbaPlayer[], count = 3): Match[] {
  return players
    .map((p) => scorePlayer(input, p))
    .sort((a, b) => b.score - a.score || Math.abs(a.heightDiffCm) - Math.abs(b.heightDiffCm))
    .slice(0, count);
}
