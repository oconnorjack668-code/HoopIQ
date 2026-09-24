// src/app/api/account/delete/route.ts
// Permanently deletes the signed-in player's account (required by the App Store and Google Play).
// Every table references auth.users with ON DELETE CASCADE, so deleting the auth
// user removes all rows; uploaded videos live in storage and are removed first.
import { getCurrentUser } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST() {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: 'Please log in again.' }, { status: 401 });
  }

  const admin = createAdminClient();

  // Remove the player's video files (stored under videos/<user_id>/)
  for (;;) {
    const { data: files, error } = await admin.storage.from('videos').list(user.id, { limit: 100 });
    if (error) {
      console.error('Account deletion: listing videos failed', error);
      return Response.json({ error: 'Could not delete your videos. Please try again.' }, { status: 500 });
    }
    if (!files || files.length === 0) break;
    const { error: removeError } = await admin.storage
      .from('videos')
      .remove(files.map((f) => `${user.id}/${f.name}`));
    if (removeError) {
      console.error('Account deletion: removing videos failed', removeError);
      return Response.json({ error: 'Could not delete your videos. Please try again.' }, { status: 500 });
    }
  }

  const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
  if (deleteError) {
    console.error('Account deletion failed', deleteError);
    return Response.json({ error: 'Could not delete your account. Please try again.' }, { status: 500 });
  }

  return Response.json({ deleted: true });
}
