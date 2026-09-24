// src/app/api/profile/visibility/route.ts
// Turns the player's leaderboard visibility (profiles.is_public) on or off.
import { getCurrentUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: 'Please log in again.' }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { isPublic?: unknown } | null;
  if (typeof body?.isPublic !== 'boolean') {
    return Response.json({ error: 'isPublic must be true or false.' }, { status: 400 });
  }

  const supabase = (await createClient()) as any;
  const { data, error } = await supabase
    .from('profiles')
    .update({ is_public: body.isPublic, updated_at: new Date().toISOString() })
    .eq('id', user.id)
    .select('id, is_public');

  if (error) {
    console.error('Leaderboard visibility update failed:', error);
    return Response.json({ error: `Database error: ${error.message}` }, { status: 500 });
  }
  if (!data || data.length === 0) {
    return Response.json(
      { error: 'Your player profile has not been set up yet. Tap "Edit player info" and save it first.' },
      { status: 404 }
    );
  }

  return Response.json({ isPublic: data[0].is_public });
}
