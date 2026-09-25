// src/lib/friends.ts
// Shapes returned by the friends database functions (00021) and helpers for the friends screens.

export interface FriendRow {
  friendship_id: string | null;
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  player_position: string | null;
  status: 'friend' | 'incoming' | 'outgoing';
  is_me: boolean;
  sessions_7d: number | null;
  workouts_7d: number | null;
  minutes_7d: number | null;
  makes_7d: number | null;
  attempts_7d: number | null;
  streak: number | null;
  last_active: string | null;
}

export interface FeedItem {
  user_id: string;
  display_name: string;
  kind: 'hoops' | 'gym' | 'badge';
  happened_on: string;
  created_at: string;
  title: string;
  detail: string | null;
}

export type RequestResult = 'sent' | 'accepted' | 'already' | 'self' | 'not_found' | 'limit';

export const REQUEST_MESSAGES: Record<RequestResult, string> = {
  sent: 'Friend request sent.',
  accepted: 'You are now friends!',
  already: "You're already friends, or a request is waiting.",
  self: "That's your own code.",
  not_found: 'No player has that code. Check the 6 letters and numbers.',
  limit: "You've reached the friend request limit. Wait for some to be accepted first.",
};

/**
 * Friends leaderboard score for the last 7 days: rewards showing up (sessions/workouts),
 * time put in and shots made, so shooters and gym players can both compete.
 */
export function weeklyScore(r: Pick<FriendRow, 'sessions_7d' | 'workouts_7d' | 'minutes_7d' | 'makes_7d'>): number {
  return (r.sessions_7d || 0) * 20 + (r.workouts_7d || 0) * 20 + Math.round((r.minutes_7d || 0) / 5) + (r.makes_7d || 0);
}

export function rankFriends(rows: FriendRow[]): FriendRow[] {
  return rows
    .filter((r) => r.status === 'friend')
    .sort((a, b) => weeklyScore(b) - weeklyScore(a) || a.display_name.localeCompare(b.display_name));
}

export function normaliseCode(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
}
