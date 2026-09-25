// src/lib/dashboard.ts
import { createClient } from '@/lib/supabase/server';
import { streaks } from '@/lib/achievements';
import { addDays, calendarNow } from '@/lib/dates';
import { getPersonalRecordCount, getShotTotals, getTrainingDates, type ZoneTotal } from '@/lib/player-activity';

export interface DashboardMetrics {
  thisWeekSessions: number;
  shootingPercentage: number;
  currentStreak: number;
  totalSessions: number;
  personalRecords: number;
  weeklyGoalProgress: number;
  weeklyGoalTarget: number;
  /** % of the last 30 days (including today) with any training logged */
  consistency: number;
}

export const CONSISTENCY_DAYS = 30;

interface MetricsInput {
  sessionDates: string[];
  workoutDates: string[];
  zones: ZoneTotal[];
  personalRecords: number;
  weeklyGoalTarget: number | null | undefined;
  /** Today's date on the players' calendar ("YYYY-MM-DD") */
  today: string;
  /** Monday of this week ("YYYY-MM-DD") */
  weekStart: string;
}

/** Pure calculation, so it can be unit tested. */
export function computeDashboardMetrics(input: MetricsInput): DashboardMetrics {
  const { sessionDates, workoutDates, zones, today, weekStart } = input;
  const weekEnd = addDays(weekStart, 6);
  const trainingDays = [...sessionDates, ...workoutDates];

  const totalMakes = zones.reduce((sum, z) => sum + z.makes, 0);
  const totalAttempts = zones.reduce((sum, z) => sum + z.attempts, 0);

  // Streak and weekly goal count every training day (hoops session or gym workout), the same
  // rule as the leaderboard, rank card, friends list and Goals page
  const { current } = streaks(trainingDays, today);
  const weekTrainingDays = new Set(trainingDays.filter((d) => d >= weekStart && d <= today)).size;
  const since = addDays(today, -(CONSISTENCY_DAYS - 1));
  const activeDays = new Set(trainingDays.filter((d) => d >= since && d <= today)).size;

  return {
    thisWeekSessions: sessionDates.filter((d) => d >= weekStart && d <= weekEnd).length,
    shootingPercentage: totalAttempts > 0 ? Math.round((totalMakes / totalAttempts) * 1000) / 10 : 0,
    currentStreak: current,
    totalSessions: sessionDates.length,
    personalRecords: input.personalRecords,
    weeklyGoalProgress: weekTrainingDays,
    weeklyGoalTarget: input.weeklyGoalTarget || 4,
    consistency: Math.round((activeDays / CONSISTENCY_DAYS) * 100),
  };
}

export async function calculateDashboardMetrics(userId: string): Promise<DashboardMetrics> {
  const supabase = await createClient();
  const { today, weekStart } = calendarNow();

  // All independent reads run in parallel; the history loaders are shared with the
  // achievements on the same page (cached per request)
  const [{ sessions, workouts }, zones, personalRecords, { data: weeklyGoal }] = await Promise.all([
    getTrainingDates(userId),
    getShotTotals(userId),
    getPersonalRecordCount(userId),
    // Weekly goal (most recent if several are active)
    supabase
      .from('goals')
      .select('target_value')
      .eq('user_id', userId)
      .eq('goal_type', 'weekly_training_days')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle() as unknown as Promise<{ data: { target_value: number } | null }>,
  ]);

  return computeDashboardMetrics({
    sessionDates: sessions,
    workoutDates: workouts,
    zones,
    personalRecords,
    weeklyGoalTarget: weeklyGoal?.target_value,
    today,
    weekStart,
  });
}

/** Career shooting per zone, best percentage first. */
export function rankZones(zones: ZoneTotal[]) {
  return zones
    .map((zone) => ({
      ...zone,
      percentage: zone.attempts > 0 ? Math.round((zone.makes / zone.attempts) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.percentage - a.percentage);
}

export async function getShootingByZone(userId: string) {
  return rankZones(await getShotTotals(userId));
}
