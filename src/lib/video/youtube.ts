// src/lib/video/youtube.ts
// Deciding whether a study lesson has a real video behind it.
//
// study_items.youtube_video_id exists for every lesson, but migration 00012
// seeded the newer lessons with the literal string 'placeholder' and the page
// sent players to a YouTube *search* for the lesson title instead - out of the
// app, onto whatever happens to rank. Curated lessons should play in place;
// only the uncurated ones should fall back to a search.

/** Values that mean "no video has been chosen for this lesson yet". */
const NOT_A_VIDEO = new Set(['', 'placeholder', 'tbd', 'none', 'null']);

/** A YouTube id is exactly 11 characters of [A-Za-z0-9_-]. */
const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;

export function isRealYoutubeId(id: string | null | undefined): boolean {
  if (!id) return false;
  const trimmed = id.trim();
  if (NOT_A_VIDEO.has(trimmed.toLowerCase())) return false;
  return YOUTUBE_ID.test(trimmed);
}

/**
 * Privacy-enhanced embed: youtube-nocookie does not set tracking cookies until
 * the viewer actually plays something, which matters for an app whose users
 * start at 13.
 */
export function youtubeEmbedUrl(id: string): string {
  return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id.trim())}`;
}

export function youtubeSearchUrl(query: string): string {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
}
