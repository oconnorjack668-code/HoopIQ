// src/lib/dashboard.ts
import { createClient } from '@/lib/supabase/server';

export interface DashboardMetrics {
  thisWeekSessions: number;
  shootingPercentage: number;
  currentStreak: number;
  totalSessions: number;
  personalRecords: number;
  weeklyGoalProgress: number;
  weeklyGoalTarget: number;
}

// YYYY-MM-DD in the server's local calendar (session_date is a plain date column)
function toDateString(d: Date): string {
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
}

function addDays(d: Date, days: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + days);
  return copy;
}

export async function calculateDashboardMetrics(userId: string): Promise<DashboardMetrics> {
  const supabase = await createClient();

  // This week runs Monday-Sunday
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const startOfWeek = addDays(today, -((today.getDay() + 6) % 7));
  const endOfWeek = addDays(startOfWeek, 6);

  const { data: weekSessions } = await supabase
    .from('training_sessions')
    .select('session_date')
    .eq('user_id', userId)
    .gte('session_date', toDateString(startOfWeek))
    .lte('session_date', toDateString(endOfWeek))
    .returns<Array<{ session_date: string }>>();

  // Get all sessions for streak calculation
  const { data: allSessions } = await supabase
    .from('training_sessions')
    .select('session_date')
    .eq('user_id', userId)
    .order('session_date', { ascending: false })
    .returns<Array<{ session_date: string }>>();

  // Streak: consecutive training days ending today, or yesterday if today isn't logged yet
  // (same rule as the leaderboard_standings view)
  const trainedDays = new Set((allSessions || []).map((s) => s.session_date));
  let currentStreak = 0;
  let cursor = trainedDays.has(toDateString(today)) ? today : addDays(today, -1);
  while (trainedDays.has(toDateString(cursor))) {
    currentStreak++;
    cursor = addDays(cursor, -1);
  }

  // Get shooting percentage
  const { data: shootingData } = await supabase
    .from('shooting_entries')
    .select('makes, attempts')
    .eq('user_id', userId)
    .returns<Array<{ makes: number; attempts: number }>>();

  const totalMakes = shootingData?.reduce((sum, s) => sum + s.makes, 0) || 0;
  const totalAttempts = shootingData?.reduce((sum, s) => sum + s.attempts, 0) || 0;
  const shootingPercentage = totalAttempts > 0 ? Math.round((totalMakes / totalAttempts) * 1000) / 10 : 0;

  // Get total sessions
  const { count: totalCount } = await supabase
    .from('training_sessions')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);

  // Personal records (workout sets + performance tests)
  const { count: prSetCount } = await supabase
    .from('workout_sets')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_personal_record', true);
  const { count: prTestCount } = await supabase
    .from('performance_tests')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_personal_record', true);

  // Get weekly goal (most recent if several are active)
  const { data: weeklyGoal } = await supabase
    .from('goals')
    .select('target_value')
    .eq('user_id', userId)
    .eq('goal_type', 'weekly_training_days')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle() as unknown as {
      data: { target_value: number } | null;
    };

  // Weekly goal counts training days, not individual sessions
  const weekTrainingDays = new Set((weekSessions || []).map((s) => s.session_date)).size;

  return {
    thisWeekSessions: weekSessions?.length || 0,
    shootingPercentage,
    currentStreak,
    totalSessions: totalCount || 0,
    personalRecords: (prSetCount || 0) + (prTestCount || 0),
    weeklyGoalProgress: weekTrainingDays,
    weeklyGoalTarget: weeklyGoal?.target_value || 4,
  };
}

export async function getSessionTrends(userId: string, days: number = 30) {
  const supabase = await createClient();

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  startDate.setHours(0, 0, 0, 0);

  const { data: sessions } = await supabase
    .from('training_sessions')
    .select('session_date, intensity_rpe, perceived_quality')
    .eq('user_id', userId)
    .gte('session_date', toDateString(startDate))
    .order('session_date', { ascending: true })
    .returns<Array<{ session_date: string; intensity_rpe: number; perceived_quality: number }>>();

  // Group by date
  const trendsByDate = (sessions || []).reduce(
    (acc, session) => {
      const date = session.session_date;
      if (!acc[date]) {
        acc[date] = {
          date,
          count: 0,
          avgRpe: 0,
          avgQuality: 0,
          totalRpe: 0,
          totalQuality: 0,
        };
      }
      acc[date].count++;
      acc[date].totalRpe += session.intensity_rpe;
      acc[date].totalQuality += session.perceived_quality;
      return acc;
    },
    {} as Record<
      string,
      { date: string; count: number; avgRpe: number; avgQuality: number; totalRpe: number; totalQuality: number }
    >
  );

  return Object.values(trendsByDate).map((trend) => ({
    date: trend.date,
    sessions: trend.count,
    avgRpe: Math.round((trend.totalRpe / trend.count) * 10) / 10,
    avgQuality: Math.round((trend.totalQuality / trend.count) * 10) / 10,
  }));
}

export async function getShootingByZone(userId: string) {
  const supabase = await createClient();

  const { data: entries } = await supabase
    .from('shooting_entries')
    .select('shot_zone, makes, attempts')
    .eq('user_id', userId)
    .returns<Array<{ shot_zone: string; makes: number; attempts: number }>>();

  const zoneData = (entries || []).reduce(
    (acc, entry) => {
      if (!acc[entry.shot_zone]) {
        acc[entry.shot_zone] = { zone: entry.shot_zone, makes: 0, attempts: 0 };
      }
      acc[entry.shot_zone].makes += entry.makes;
      acc[entry.shot_zone].attempts += entry.attempts;
      return acc;
    },
    {} as Record<string, { zone: string; makes: number; attempts: number }>
  );

  return Object.values(zoneData)
    .map((zone) => ({
      ...zone,
      percentage: zone.attempts > 0 ? Math.round((zone.makes / zone.attempts) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.percentage - a.percentage);
}
