// src/components/video/DetectorBench.tsx
'use client';

import React, { useRef, useState } from 'react';
import { getBallDetector, createDiagnosticDetector, getActiveDelegate } from '@/lib/video/mediapipe';
import { ShotDetector, rimFromEdges, type DetectedShot } from '@/lib/video/shotDetector';
import { cropRectFor, ballCentreInFrame, magnification, CROP_CANVAS_PX } from '@/lib/video/crop';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { FileVideo, Play, Search } from 'lucide-react';

/** Mirrors LOST_BALL_MS in shotDetector: a gap longer than this turns an armed
 *  shot into a miss, so gaps are the statistic that predicts false misses. */
const LOST_BALL_MS = 1500;

interface Report {
  durationS: number;
  wallClockS: number;
  frames: number;
  framesWithBall: number;
  scores: number[];
  maxGapMs: number;
  gapsOverLimit: number;
  shots: DetectedShot[];
}

interface Diagnosis {
  frames: number;
  delegate: string;
  videoSize: string;
  /** Every COCO class seen, with how many frames it appeared in and its best score. */
  classes: Array<{ label: string; frames: number; best: number }>;
  framesWithAnything: number;
}

function median(xs: number[]): number {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

function pct(n: number, d: number): string {
  return d > 0 ? `${Math.round((n / d) * 1000) / 10}%` : '–';
}

export function DetectorBench() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasVideo, setHasVideo] = useState(false);
  const [rim, setRim] = useState<{ x: number; y: number; width: number } | null>(null);
  const [firstEdge, setFirstEdge] = useState<{ x: number; y: number } | null>(null);
  const [running, setRunning] = useState(false);
  const [report, setReport] = useState<Report | null>(null);
  const [diagnosis, setDiagnosis] = useState<Diagnosis | null>(null);
  const [magnify, setMagnify] = useState(1);
  const [error, setError] = useState<string | null>(null);

  // Ground truth, typed in by whoever shot the clip
  const [trueAttempts, setTrueAttempts] = useState('');
  const [trueMakes, setTrueMakes] = useState('');

  function pick(file: File) {
    setHasVideo(true);
    setReport(null);
    setRim(null);
    setError(null);
    requestAnimationFrame(() => {
      if (videoRef.current) videoRef.current.src = URL.createObjectURL(file);
    });
  }

  function tapRim(e: React.MouseEvent<HTMLVideoElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const point = {
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
    };
    if (!firstEdge) {
      setFirstEdge(point);
      setRim(null);
      return;
    }
    setRim(rimFromEdges(firstEdge, point));
    setFirstEdge(null);
  }

  /**
   * Plays the clip through once, handing each frame to `onFrame`.
   * Shared so the benchmark and the diagnosis measure identical conditions.
   */
  async function sweep(onFrame: (video: HTMLVideoElement, videoMs: number, ts: number) => void) {
    const video = videoRef.current;
    if (!video) return;
    let lastTs = 0;
    video.currentTime = 0;
    video.playbackRate = 1;
    await video.play();
    await new Promise<void>((resolve) => {
      const step = () => {
        if (video.paused || video.ended) {
          resolve();
          return;
        }
        const videoMs = video.currentTime * 1000;
        const ts = Math.max(lastTs + 1, Math.round(videoMs));
        lastTs = ts;
        onFrame(video, videoMs, ts);
        const v = video as HTMLVideoElement & { requestVideoFrameCallback?: (cb: () => void) => number };
        if (v.requestVideoFrameCallback) v.requestVideoFrameCallback(step);
        else requestAnimationFrame(step);
      };
      step();
    });
  }

  /** Runs the model with no class filter, to find out what it can see at all. */
  async function diagnose() {
    const video = videoRef.current;
    if (!video) return;
    setRunning(true);
    setError(null);
    setDiagnosis(null);
    try {
      const detector = await createDiagnosticDetector();
      const seen = new Map<string, { frames: number; best: number }>();
      let frames = 0;
      let framesWithAnything = 0;

      await sweep((v, _videoMs, ts) => {
        frames += 1;
        const result = detector.detectForVideo(v, ts);
        const detections = result.detections || [];
        if (detections.length) framesWithAnything += 1;
        const labelsThisFrame = new Set<string>();
        for (const d of detections) {
          const cat = d.categories[0];
          if (!cat) continue;
          const label = cat.categoryName || `#${cat.index}`;
          const prev = seen.get(label) || { frames: 0, best: 0 };
          seen.set(label, {
            frames: prev.frames + (labelsThisFrame.has(label) ? 0 : 1),
            best: Math.max(prev.best, cat.score || 0),
          });
          labelsThisFrame.add(label);
        }
      });

      setDiagnosis({
        frames,
        delegate: getActiveDelegate() || 'unknown',
        videoSize: `${video.videoWidth}x${video.videoHeight}`,
        framesWithAnything,
        classes: [...seen.entries()]
          .map(([label, v]) => ({ label, ...v }))
          .sort((a, b) => b.frames - a.frames),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Diagnosis failed.');
    } finally {
      setRunning(false);
    }
  }

  async function run() {
    const video = videoRef.current;
    if (!video || !rim) return;
    setRunning(true);
    setError(null);
    setReport(null);

    try {
      const detector = await getBallDetector();
      const shotDetector = new ShotDetector(rim);
      const scores: number[] = [];
      let frames = 0;
      let framesWithBall = 0;
      let maxGapMs = 0;
      let gapsOverLimit = 0;
      let lastBallMs: number | null = null;
      const startedAt = performance.now();

      // Video time, not wall clock: the detector reasons in milliseconds and
      // this keeps the gap measurements true to the footage.
      const canvas = document.createElement('canvas');
      canvas.width = CROP_CANVAS_PX;
      canvas.height = CROP_CANVAS_PX;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not get a 2d canvas context.');
      let gain = 1;

      await sweep((v, videoMs, ts) => {
        // Same hoop crop the tracker uses, so the benchmark measures the real thing
        const crop = cropRectFor(rim, v.videoWidth, v.videoHeight);
        gain = magnification(crop, v.videoWidth);
        ctx.drawImage(v, crop.sx, crop.sy, crop.side, crop.side, 0, 0, CROP_CANVAS_PX, CROP_CANVAS_PX);

        const result = detector.detectForVideo(canvas, ts);
        const best = [...(result.detections || [])].sort(
          (a, b) => (b.categories[0]?.score || 0) - (a.categories[0]?.score || 0)
        )[0];
        frames += 1;

        const box = best?.boundingBox;
        if (box) {
          framesWithBall += 1;
          scores.push(best.categories[0]?.score || 0);
          if (lastBallMs !== null) {
            const gap = videoMs - lastBallMs;
            if (gap > maxGapMs) maxGapMs = gap;
            if (gap > LOST_BALL_MS) gapsOverLimit += 1;
          }
          lastBallMs = videoMs;
        }

        shotDetector.push({
          t: videoMs,
          ball: box ? ballCentreInFrame(box, crop, v.videoWidth, v.videoHeight) : null,
        });
      });
      setMagnify(gain);

      setReport({
        durationS: video.duration || 0,
        wallClockS: (performance.now() - startedAt) / 1000,
        frames,
        framesWithBall,
        scores,
        maxGapMs,
        gapsOverLimit,
        shots: shotDetector.shots,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Detection failed.');
    } finally {
      setRunning(false);
    }
  }

  const detectedAttempts = report?.shots.length ?? 0;
  const detectedMakes = report?.shots.filter((s) => s.made).length ?? 0;
  const ta = Number(trueAttempts);
  const tm = Number(trueMakes);
  const haveTruth = trueAttempts !== '' && trueMakes !== '' && Number.isFinite(ta) && Number.isFinite(tm);

  return (
    <div className="space-y-4">
      {error && <Alert variant="error" title="Detection failed">{error}</Alert>}

      {!hasVideo ? (
        <label className="flex items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 cursor-pointer hover:bg-zinc-900">
          <FileVideo className="h-6 w-6 text-cyan-400" />
          <div>
            <div className="font-semibold text-white">Choose a test clip</div>
            <div className="text-xs text-zinc-500">Runs on this device. Nothing is uploaded.</div>
          </div>
          <input type="file" accept="video/*" className="hidden" onChange={(e) => e.target.files?.[0] && pick(e.target.files[0])} />
        </label>
      ) : (
        <>
          <div className="relative">
            <video
              ref={videoRef}
              controls
              playsInline
              muted
              onClick={tapRim}
              className="w-full rounded-2xl bg-black cursor-crosshair"
            />
            {firstEdge && (
              <div
                className="pointer-events-none absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-orange-500 ring-2 ring-white"
                style={{ left: `${firstEdge.x * 100}%`, top: `${firstEdge.y * 100}%` }}
              />
            )}
            {rim && (
              <div
                className="pointer-events-none absolute h-1 -translate-y-1/2 rounded-full bg-orange-500 ring-1 ring-white/60"
                style={{ left: `${(rim.x - rim.width / 2) * 100}%`, top: `${rim.y * 100}%`, width: `${rim.width * 100}%` }}
              />
            )}
          </div>

          <p className="text-sm text-zinc-400">
            {rim
              ? `Rim measured: ${(rim.width * 100).toFixed(1)}% of frame width. Run the benchmark.`
              : firstEdge
                ? 'Now tap the other side of the rim.'
                : 'Pause on a frame showing the hoop, then tap one side of the rim and the other.'}
          </p>

          <Button variant="primary" size="lg" className="w-full gap-2" disabled={!rim} isLoading={running} onClick={() => void run()}>
            <Play className="h-4 w-4" /> {running ? 'Processing in real time…' : 'Run benchmark'}
          </Button>

          <Button variant="secondary" size="lg" className="w-full gap-2" isLoading={running} onClick={() => void diagnose()}>
            <Search className="h-4 w-4" /> What can the model see? (no rim needed)
          </Button>

          {diagnosis && (
            <div className="space-y-3 rounded-2xl border border-amber-600/40 bg-amber-600/10 p-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-amber-300">Everything the model detected</h3>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                <span className="text-zinc-400">Frames</span>
                <span className="text-right font-semibold text-white">{diagnosis.frames}</span>
                <span className="text-zinc-400">Frames with any object</span>
                <span className="text-right font-semibold text-white">
                  {diagnosis.framesWithAnything} ({pct(diagnosis.framesWithAnything, diagnosis.frames)})
                </span>
                <span className="text-zinc-400">Video size</span>
                <span className="text-right font-semibold text-white">{diagnosis.videoSize}</span>
                <span className="text-zinc-400">Running on</span>
                <span className="text-right font-semibold text-white">{diagnosis.delegate}</span>
              </div>

              {diagnosis.classes.length === 0 ? (
                <p className="text-sm font-semibold text-red-400">
                  The model returned nothing at all, for any class. That is a broken pipeline, not a hard-to-see ball.
                </p>
              ) : (
                <div className="space-y-1 text-sm">
                  {diagnosis.classes.map((c) => (
                    <div key={c.label} className="flex items-center justify-between gap-2">
                      <span className={c.label === 'sports ball' ? 'font-bold text-emerald-400' : 'text-zinc-300'}>
                        {c.label}
                      </span>
                      <span className="text-zinc-400">
                        {c.frames} frames ({pct(c.frames, diagnosis.frames)}) · best {c.best.toFixed(3)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-xs text-zinc-400">
                If &ldquo;sports ball&rdquo; is absent but other classes are present, the model works and simply cannot
                resolve the ball. If it is present here but the benchmark above finds nothing, the score threshold or
                the class filter is wrong.
              </p>
            </div>
          )}

          {report && (
            <div className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400 mb-2">Ball detection</h3>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                  <span className="text-zinc-400">Frames processed</span>
                  <span className="text-right font-semibold text-white">{report.frames}</span>
                  <span className="text-zinc-400">Ball found in</span>
                  <span className="text-right font-semibold text-white">
                    {report.framesWithBall} ({pct(report.framesWithBall, report.frames)})
                  </span>
                  <span className="text-zinc-400">Median confidence</span>
                  <span className="text-right font-semibold text-white">{median(report.scores).toFixed(3)}</span>
                  <span className="text-zinc-400">Best confidence</span>
                  <span className="text-right font-semibold text-white">
                    {report.scores.length ? Math.max(...report.scores).toFixed(3) : '–'}
                  </span>
                  <span className="text-zinc-400">Hoop crop magnification</span>
                  <span className="text-right font-semibold text-white">{magnify.toFixed(1)}x</span>
                  <span className="text-zinc-400">Longest gap with no ball</span>
                  <span className="text-right font-semibold text-white">{Math.round(report.maxGapMs)} ms</span>
                  <span className="text-zinc-400">Gaps over {LOST_BALL_MS} ms</span>
                  <span className="text-right font-semibold text-white">{report.gapsOverLimit}</span>
                  <span className="text-zinc-400">Processing rate</span>
                  <span className="text-right font-semibold text-white">
                    {(report.frames / Math.max(report.wallClockS, 0.001)).toFixed(1)} fps
                  </span>
                </div>
                <p className="mt-2 text-xs text-zinc-500">
                  Gaps matter most: an armed shot with the ball unseen for {LOST_BALL_MS} ms is scored a miss, so a high
                  gap count predicts makes being called misses.
                </p>
              </div>

              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400 mb-2">
                  Shots called ({detectedMakes}/{detectedAttempts})
                </h3>
                {report.shots.length === 0 ? (
                  <p className="text-sm text-zinc-500">No shots detected.</p>
                ) : (
                  <div className="max-h-48 space-y-1 overflow-y-auto text-sm">
                    {report.shots.map((s, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <span className="w-12 tabular-nums text-xs text-zinc-500">{(s.t / 1000).toFixed(1)}s</span>
                        <span className={s.made ? 'font-semibold text-emerald-400' : 'font-semibold text-red-400'}>
                          {s.made ? 'MAKE' : 'MISS'}
                        </span>
                        {!s.confident && <span className="text-[10px] uppercase text-amber-500">inferred</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400 mb-2">Against what really happened</h3>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    inputMode="numeric"
                    value={trueAttempts}
                    onChange={(e) => setTrueAttempts(e.target.value)}
                    placeholder="Actual attempts"
                    aria-label="Actual attempts"
                    className="rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white"
                  />
                  <input
                    inputMode="numeric"
                    value={trueMakes}
                    onChange={(e) => setTrueMakes(e.target.value)}
                    placeholder="Actual makes"
                    aria-label="Actual makes"
                    className="rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white"
                  />
                </div>
                {haveTruth && (
                  <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                    <span className="text-zinc-400">Attempts</span>
                    <span className="text-right font-semibold text-white">
                      {detectedAttempts} vs {ta} ({detectedAttempts - ta >= 0 ? '+' : ''}
                      {detectedAttempts - ta})
                    </span>
                    <span className="text-zinc-400">Makes</span>
                    <span className="text-right font-semibold text-white">
                      {detectedMakes} vs {tm} ({detectedMakes - tm >= 0 ? '+' : ''}
                      {detectedMakes - tm})
                    </span>
                    <span className="text-zinc-400">Attempts found</span>
                    <span className="text-right font-semibold text-white">{pct(Math.min(detectedAttempts, ta), ta)}</span>
                  </div>
                )}
                <p className="mt-2 text-xs text-zinc-500">
                  Counts only. Matching each detected shot to the right real one needs the review UI; this is enough to
                  tell whether the detector is worth building on.
                </p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
