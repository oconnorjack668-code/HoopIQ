// __tests__/friends.test.ts
import { describe, it, expect } from 'vitest';
import { normaliseCode, rankFriends, weeklyScore, type FriendRow } from '@/lib/friends';

const row = (over: Partial<FriendRow>): FriendRow => ({
  friendship_id: 'f',
  user_id: over.display_name || 'u',
  display_name: 'Player',
  avatar_url: null,
  player_position: null,
  status: 'friend',
  is_me: false,
  sessions_7d: 0,
  workouts_7d: 0,
  minutes_7d: 0,
  makes_7d: 0,
  attempts_7d: 0,
  streak: 0,
  last_active: null,
  ...over,
});

describe('friends', () => {
  it('scores sessions, workouts, minutes and makes', () => {
    expect(weeklyScore({ sessions_7d: 2, workouts_7d: 1, minutes_7d: 100, makes_7d: 30 })).toBe(40 + 20 + 20 + 30);
    expect(weeklyScore({ sessions_7d: null, workouts_7d: null, minutes_7d: null, makes_7d: null })).toBe(0);
  });

  it('ranks only accepted friends (and you), highest score first', () => {
    const ranked = rankFriends([
      row({ display_name: 'Low', sessions_7d: 1 }),
      row({ display_name: 'Pending', status: 'incoming', sessions_7d: 9 }),
      row({ display_name: 'Me', is_me: true, sessions_7d: 3 }),
      row({ display_name: 'High', sessions_7d: 5 }),
    ]);
    expect(ranked.map((r) => r.display_name)).toEqual(['High', 'Me', 'Low']);
  });

  it('cleans typed friend codes', () => {
    expect(normaliseCode(' ab-c 12x9 ')).toBe('ABC12X');
  });
});
