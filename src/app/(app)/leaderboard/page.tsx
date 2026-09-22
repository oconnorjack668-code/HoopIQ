// src/app/(app)/leaderboard/page.tsx
import React from 'react';
import { requireUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Trophy, Flame, Star, Target } from 'lucide-react';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Leaderboard - HoopIQ',
};

// Leaderboard scoring formula:
// Base points: 10 × (shooting % + consistency streak + test PRs)
// Bonus: +5 for each completed training day (max +35/week)
// Challenge: +50 per challenge completed
// Quiz: +10 per quiz at 80%+ score

export default async function LeaderboardPage() {
  const user = await requireUser();
  const supabase = await createClient();

  // Fetch current season
  const { data: currentSeason } = (await supabase
    .from('leaderboard_seasons')
    .select('*')
    .eq('is_active', true)
    .single()) as unknown as { data: any };

  // Fetch leaderboard standings
  const { data: standings } = (await supabase
    .from('leaderboard_standings')
    .select('*')
    .eq('season_id', currentSeason?.id)
    .order('points', { ascending: false })
    .limit(100)) as unknown as { data: any[] };

  // Fetch user's current position
  const { data: userStanding } = (await supabase
    .from('leaderboard_standings')
    .select('*')
    .eq('season_id', currentSeason?.id)
    .eq('user_id', user.id)
    .single()) as unknown as { data: any };

  // Fetch active challenges
  const { data: challenges } = (await supabase
    .from('challenges')
    .select('*')
    .eq('season_id', currentSeason?.id)
    .eq('is_active', true)) as unknown as { data: any[] };

  // Fetch user's challenge completions
  const { data: userChallenges } = (await supabase
    .from('challenge_completions')
    .select('*')
    .eq('user_id', user.id)) as unknown as { data: any[] };

  const userChallengeIds = new Set(userChallenges?.map((c) => c.challenge_id) || []);

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-4 md:p-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-tr from-amber-600 to-orange-500 flex items-center justify-center shadow-lg">
              <Trophy className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight text-white">Leaderboard</h1>
              <p className="text-sm text-zinc-400 mt-1">
                {currentSeason?.name || 'Season'} · Compete and earn rewards
              </p>
            </div>
          </div>
        </div>

        {/* Your Rank */}
        {userStanding && (
          <Card className="border-blue-500/30 bg-blue-500/10 mb-8">
            <CardContent className="p-5">
              <div className="grid grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-xs text-zinc-400 font-semibold uppercase mb-1">Your Rank</div>
                  <div className="text-2xl font-black text-blue-400">#{userStanding.rank}</div>
                </div>
                <div>
                  <div className="text-xs text-zinc-400 font-semibold uppercase mb-1">Points</div>
                  <div className="text-2xl font-black text-white">{userStanding.points}</div>
                </div>
                <div>
                  <div className="text-xs text-zinc-400 font-semibold uppercase mb-1">Sessions</div>
                  <div className="text-2xl font-black text-emerald-400">{userStanding.sessions_completed}</div>
                </div>
                <div>
                  <div className="text-xs text-zinc-400 font-semibold uppercase mb-1">Streak</div>
                  <div className="flex items-center justify-center gap-1 text-lg">
                    <Flame className="h-5 w-5 text-orange-400" />
                    <span className="font-black text-orange-400">{userStanding.current_streak}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Scoring Formula */}
        <Card className="border-zinc-800 bg-zinc-900/50 mb-8">
          <CardHeader>
            <CardTitle className="text-base">How Points Are Calculated</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-start gap-2">
              <span className="font-bold text-blue-400 min-w-fit">Base:</span>
              <span className="text-zinc-300">10 × (shooting % + consistency streak + test PRs)</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-bold text-emerald-400 min-w-fit">Daily:</span>
              <span className="text-zinc-300">+5 for each completed training day (max +35/week)</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-bold text-purple-400 min-w-fit">Challenge:</span>
              <span className="text-zinc-300">+50 per challenge completed</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-bold text-amber-400 min-w-fit">Quiz:</span>
              <span className="text-zinc-300">+10 per quiz at 80%+ score</span>
            </div>
          </CardContent>
        </Card>

        {/* Leaderboard */}
        <div className="mb-8">
          <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
            <Trophy className="h-5 w-5 text-amber-400" />
            Top Players
          </h2>

          <Card className="border-zinc-800 bg-zinc-900/70">
            <CardContent className="p-0">
              <div className="divide-y divide-zinc-800">
                {standings && standings.length > 0 ? (
                  standings.map((player, idx) => {
                    const isCurrentUser = player.user_id === user.id;
                    const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : null;

                    return (
                      <div
                        key={player.id}
                        className={`p-4 flex items-center justify-between ${
                          isCurrentUser ? 'bg-blue-500/10 border-l-2 border-blue-500' : 'hover:bg-zinc-800/50'
                        }`}
                      >
                        <div className="flex items-center gap-4 flex-1">
                          <div className="w-8 text-center">
                            {medal ? (
                              <span className="text-xl">{medal}</span>
                            ) : (
                              <span className="text-sm font-bold text-zinc-500">#{idx + 1}</span>
                            )}
                          </div>
                          <div>
                            <h3 className="font-semibold text-white">
                              {player.player_name}
                              {isCurrentUser && (
                                <Badge variant="orange" className="ml-2 text-xs">
                                  You
                                </Badge>
                              )}
                            </h3>
                            <div className="text-xs text-zinc-500 flex items-center gap-2 mt-1">
                              <span>{player.sessions_completed} sessions</span>
                              {player.current_streak > 0 && (
                                <>
                                  <span>·</span>
                                  <span className="flex items-center gap-1">
                                    <Flame className="h-3 w-3 text-orange-400" />
                                    {player.current_streak} day streak
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-black text-amber-400">{player.points}</div>
                          <div className="text-xs text-zinc-500">pts</div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="p-8 text-center">
                    <p className="text-sm text-zinc-400">Leaderboard coming soon</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Active Challenges */}
        {challenges && challenges.length > 0 && (
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
              <Target className="h-5 w-5 text-purple-400" />
              Active Challenges
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {challenges.map((challenge) => {
                const isCompleted = userChallengeIds.has(challenge.id);

                return (
                  <Card key={challenge.id} className="border-zinc-800 bg-zinc-900/70">
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-bold text-white">{challenge.title}</h3>
                          <p className="text-xs text-zinc-400 mt-1">{challenge.description}</p>
                        </div>
                        {isCompleted && (
                          <Badge variant="success" className="text-xs flex-shrink-0">
                            ✓ Completed
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-4 mt-4 pt-4 border-t border-zinc-800">
                        <div>
                          <div className="text-xs text-zinc-500 font-semibold">Reward</div>
                          <div className="flex items-center gap-1 text-lg font-black text-amber-400">
                            <Star className="h-4 w-4" />
                            {challenge.points}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-zinc-500 font-semibold">Duration</div>
                          <div className="text-sm text-zinc-300">
                            {new Date(challenge.end_date).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
