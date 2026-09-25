// src/lib/video/highlights.ts
// Picks the parts of a shooting video to put in a highlight reel: a few seconds around each make,
// merged when makes are close together.

export interface ClipWindow {
  startMs: number;
  endMs: number;
  /** How many makes fall inside this window */
  makes: number;
}

export function highlightWindows(
  makeTimesMs: number[],
  { beforeMs = 3000, afterMs = 1500, maxMakes = 20, durationMs = Infinity }: { beforeMs?: number; afterMs?: number; maxMakes?: number; durationMs?: number } = {}
): ClipWindow[] {
  const times = [...makeTimesMs].filter((t) => Number.isFinite(t) && t >= 0).sort((a, b) => a - b).slice(0, maxMakes);
  const windows: ClipWindow[] = [];
  for (const t of times) {
    const startMs = Math.max(0, t - beforeMs);
    const endMs = Math.min(durationMs, t + afterMs);
    const last = windows[windows.length - 1];
    if (last && startMs <= last.endMs) {
      last.endMs = Math.max(last.endMs, endMs);
      last.makes += 1;
    } else {
      windows.push({ startMs, endMs, makes: 1 });
    }
  }
  return windows;
}

export function reelLengthMs(windows: ClipWindow[]): number {
  return windows.reduce((n, w) => n + (w.endMs - w.startMs), 0);
}

/** Best video format the browser can record: MP4 shares best to Instagram/TikTok, WebM otherwise. */
export function pickRecordingType(isSupported: (type: string) => boolean): { mimeType: string; extension: 'mp4' | 'webm' } | null {
  const candidates: Array<[string, 'mp4' | 'webm']> = [
    ['video/mp4;codecs=avc1', 'mp4'],
    ['video/mp4', 'mp4'],
    ['video/webm;codecs=vp9', 'webm'],
    ['video/webm;codecs=vp8', 'webm'],
    ['video/webm', 'webm'],
  ];
  for (const [mimeType, extension] of candidates) if (isSupported(mimeType)) return { mimeType, extension };
  return null;
}
