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

export async function calculateDashboardMetrics(userId: string): Promise<DashboardMetrics> {
  const supabase = await createClient();

  // Get this week's sessions (Monday-Sunday)
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay()); // Start from Sunday
  startOfWeek.setHours(0, 0, 0, 0);

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);

  const { data: weekSessions } = await supabase
    .from('training_sessions')
    .select('*')
    .eq('user_id', userId)
    .gte('session_date', startOfWeek.toISOString().split('T')[0])
    .lte('session_date', endOfWeek.toISOString().split('T')[0])
    .returns<Array<{ session_date: string }>>();

  // Get all sessions for streak calculation
  const { data: allSessions } = await supabase
    .from('training_sessions')
    .select('session_date')
    .eq('user_id', userId)
    .order('session_date', { ascending: false })
    .returns<Array<{ session_date: string }>>();

  // Calculate streak
  let currentStreak = 0;
  if (allSessions && allSessions.length > 0) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const session of allSessions) {
      const sessionDate = new Date(session.session_date);
      sessionDate.setHours(0, 0, 0, 0);

      const daysDiff = Math.floor((today.getTime() - sessionDate.getTime()) / (1000 * 60 * 60 * 24));

      if (daysDiff === currentStreak) {
        currentStreak++;
      } else if (daysDiff > currentStreak) {
        break;
      }
    }
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
  const { data: allSessionsCount, count: totalCount } = await supabase
    .from('training_sessions')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);

  // Get PRs from this week
  const { data: prSets, count: prCount } = await supabase
    .from('workout_sets')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_personal_record', true);

  // Get weekly goal
  const { data: weeklyGoal } = await supabase
    .from('goals')
    .select('*')
    .eq('user_id', userId)
    .eq('goal_type', 'weekly_training_days')
    .eq('is_active', true)
    .single() as unknown as {
      data: { target_value: number } | null;
    };

  return {
    thisWeekSessions: weekSessions?.length || 0,
    shootingPercentage,
    currentStreak,
    totalSessions: totalCount || 0,
    personalRecords: prCount || 0,
    weeklyGoalProgress: weekSessions?.length || 0,
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
    .gte('session_date', startDate.toISOString().split('T')[0])
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
