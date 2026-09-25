// src/lib/achievements.ts
// Weekly challenges, badges, XP and ranks. Pure helpers here; the server loader
// (loadAchievements in achievements-server.ts) gathers stats and awards.

export interface PlayerStats {
  totalSessions: number;
  totalWorkouts: number;
  totalMakes: number;
  totalLessons: number;
  sectionsWithLesson: number;
  totalPRs: number;
  programsCompleted: number;
  videoTracked: number;
  longestStreak: number;
  currentStreak: number;
  week: {
    trainingDays: number;
    makes: number;
    lessons: number;
    workouts: number;
    sessions: number;
    programSessions: number;
  };
}

export interface ChallengeRules {
  metric: 'training_days' | 'makes' | 'study_lessons' | 'workouts' | 'balanced' | 'program_sessions';
  target: number;
}

export function challengeProgress(rules: ChallengeRules, s: PlayerStats): { current: number; target: number; done: boolean } {
  const w = s.week;
  const current = {
    training_days: w.trainingDays,
    makes: w.makes,
    study_lessons: w.lessons,
    workouts: w.workouts,
    // One point each for a basketball session, a workout and a lesson this week
    balanced: (w.sessions > 0 ? 1 : 0) + (w.workouts > 0 ? 1 : 0) + (w.lessons > 0 ? 1 : 0),
    program_sessions: w.programSessions,
  }[rules.metric] ?? 0;
  return { current: Math.min(current, rules.target), target: rules.target, done: current >= rules.target };
}

export type BadgeTier = 'bronze' | 'silver' | 'gold' | 'diamond' | 'legend';

export interface Badge {
  id: string;
  title: string;
  description: string;
  tier: BadgeTier;
  icon: string; // lucide icon name
  earned: (s: PlayerStats) => boolean;
}

export const BADGES: Badge[] = [
  { id: 'first-session', title: 'First Session', description: 'Log your first basketball session', tier: 'bronze', icon: 'Target', earned: (s) => s.totalSessions >= 1 },
  { id: 'sessions-10', title: 'Getting Reps', description: 'Log 10 basketball sessions', tier: 'silver', icon: 'Target', earned: (s) => s.totalSessions >= 10 },
  { id: 'sessions-50', title: 'Gym Rat', description: 'Log 50 basketball sessions', tier: 'gold', icon: 'Flame', earned: (s) => s.totalSessions >= 50 },
  { id: 'sessions-100', title: 'Century', description: 'Log 100 basketball sessions', tier: 'diamond', icon: 'Crown', earned: (s) => s.totalSessions >= 100 },
  { id: 'makes-1000', title: '1K Makes', description: 'Make 1,000 shots', tier: 'silver', icon: 'CircleDot', earned: (s) => s.totalMakes >= 1000 },
  { id: 'makes-5000', title: '5K Makes', description: 'Make 5,000 shots', tier: 'gold', icon: 'CircleDot', earned: (s) => s.totalMakes >= 5000 },
  { id: 'makes-10000', title: '10K Club', description: 'Make 10,000 shots', tier: 'diamond', icon: 'Gem', earned: (s) => s.totalMakes >= 10000 },
  { id: 'streak-7', title: 'Week Warrior', description: 'Train 7 days in a row', tier: 'silver', icon: 'Flame', earned: (s) => s.longestStreak >= 7 },
  { id: 'streak-30', title: 'Unstoppable', description: 'Train 30 days in a row', tier: 'legend', icon: 'Zap', earned: (s) => s.longestStreak >= 30 },
  { id: 'first-pr', title: 'New Personal Best', description: 'Set your first personal record', tier: 'bronze', icon: 'Trophy', earned: (s) => s.totalPRs >= 1 },
  { id: 'prs-10', title: 'Record Breaker', description: 'Set 10 personal records', tier: 'gold', icon: 'Trophy', earned: (s) => s.totalPRs >= 10 },
  { id: 'gym-20', title: 'Iron Hooper', description: 'Log 20 gym workouts', tier: 'silver', icon: 'Dumbbell', earned: (s) => s.totalWorkouts >= 20 },
  { id: 'student', title: 'Student of the Game', description: 'Complete your first IQ lesson', tier: 'bronze', icon: 'BookOpen', earned: (s) => s.totalLessons >= 1 },
  { id: 'scholar', title: 'IQ Scholar', description: 'Complete a lesson in all 12 IQ sections', tier: 'gold', icon: 'GraduationCap', earned: (s) => s.sectionsWithLesson >= 12 },
  { id: 'program-finisher', title: 'Program Finisher', description: 'Complete a full training program', tier: 'gold', icon: 'CalendarCheck', earned: (s) => s.programsCompleted >= 1 },
  { id: 'video-tracker', title: 'On Camera', description: 'Track a shooting session with Video AI', tier: 'bronze', icon: 'Video', earned: (s) => s.videoTracked >= 1 },
];

export const RANKS = [
  { name: 'Rookie', min: 0 },
  { name: 'Prospect', min: 300 },
  { name: 'Rotation Player', min: 800 },
  { name: 'Starter', min: 1600 },
  { name: 'All-Star', min: 3000 },
  { name: 'MVP', min: 5000 },
  { name: 'Hall of Famer', min: 8000 },
  { name: 'GOAT', min: 12000 },
] as const;

export function xpFor(s: PlayerStats, challengePoints: number, badgeCount: number): number {
  return (
    s.totalSessions * 20 +
    s.totalWorkouts * 20 +
    Math.floor(s.totalMakes / 10) +
    s.totalLessons * 25 +
    s.totalPRs * 30 +
    challengePoints +
    badgeCount * 50
  );
}

export function rankFor(xp: number): { name: string; next: { name: string; min: number } | null; progress: number } {
  let index = 0;
  RANKS.forEach((r, i) => {
    if (xp >= r.min) index = i;
  });
  const current = RANKS[index];
  const next = RANKS[index + 1] || null;
  const progress = next ? (xp - current.min) / (next.min - current.min) : 1;
  return { name: current.name, next: next ? { name: next.name, min: next.min } : null, progress };
}

/** Longest and current run of consecutive training days (current counts from today or yesterday). */
export function streaks(days: string[], today: string): { longest: number; current: number } {
  const set = new Set(days);
  const sorted = [...set].sort();
  const dayMs = 86_400_000;
  const toMs = (d: string) => Date.parse(`${d}T00:00:00Z`);
  let longest = 0;
  let run = 0;
  let prev: number | null = null;
  for (const d of sorted) {
    const ms = toMs(d);
    run = prev !== null && ms - prev === dayMs ? run + 1 : 1;
    longest = Math.max(longest, run);
    prev = ms;
  }
  let current = 0;
  let cursor = set.has(today) ? toMs(today) : toMs(today) - dayMs;
  while (set.has(new Date(cursor).toISOString().slice(0, 10))) {
    current++;
    cursor -= dayMs;
  }
  return { longest, current };
}
