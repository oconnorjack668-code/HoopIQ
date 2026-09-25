// src/components/video/ShotTracker.tsx
'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { ShotDetector, type DetectedShot, type Rim } from '@/lib/video/shotDetector';
import { getBallDetector } from '@/lib/video/mediapipe';
import { ZONE_LABELS, ZONE_SPOTS, type CourtZone } from '@/lib/court';
import type { ShootingSummary } from '@/components/video/VideoAIFeedback';
import { Camera, FileVideo, Crosshair, Square, Trash2, Plus, Activity } from 'lucide-react';

type Step = 'source' | 'calibrate' | 'tracking' | 'review';
type Source = 'camera' | 'file';

export interface TrackedShot extends DetectedShot {
  id: number;
}

function clock(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export function ShotTracker({
  onCheckForm,
  onSummary,
}: {
  onCheckForm?: (file: File, shotTimeMs: number) => void;
  onSummary?: (summary: ShootingSummary | null) => void;
}) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileRef = useRef<File | null>(null);
  const stopRef = useRef(false);
  const lockRef = useRef<{ release: () => Promise<void> } | null>(null);

  const [step, setStep] = useState<Step>('source');
  const [source, setSource] = useState<Source>('file');
  const [rim, setRim] = useState<Rim | null>(null);
  const [rimWidth, setRimWidth] = useState(0.07);
  const [shots, setShots] = useState<TrackedShot[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [zone, setZone] = useState<CourtZone | 'all-around'>('all-around');
  const [saving, setSaving] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);

  // Release the camera and screen lock when leaving the page
  useEffect(
    () => () => {
      stopRef.current = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      lockRef.current?.release().catch(() => undefined);
    },
    []
  );

  // Share the reviewed shots with the AI feedback panel
  useEffect(() => {
    if (step !== 'review' || shots.length === 0) {
      onSummary?.(null);
      return;
    }
    onSummary?.({
      makes: shots.filter((x) => x.made).length,
      attempts: shots.length,
      zone,
      minutes: Math.round(elapsedMs / 60000),
    });
  }, [step, shots, zone, elapsedMs, onSummary]);

  async function openCamera() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      setSource('camera');
      setStep('calibrate');
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => undefined);
        }
      });
    } catch {
      setError('Could not open the camera. Allow camera access for HoopIQ in your browser settings.');
    }
  }

  function openFile(file: File) {
    fileRef.current = file;
    setSource('file');
    setStep('calibrate');
    requestAnimationFrame(() => {
      if (videoRef.current) {
        videoRef.current.srcObject = null;
        videoRef.current.src = URL.createObjectURL(file);
        videoRef.current.currentTime = 0.1;
      }
    });
  }

  function tapRim(e: React.MouseEvent<HTMLCanvasElement>) {
    if (step !== 'calibrate') return;
    const rect = e.currentTarget.getBoundingClientRect();
    setRim({ x: (e.clientX - rect.left) / rect.width, y: (e.clientY - rect.top) / rect.height, width: rimWidth });
  }

  // Draw the rim marker (and, while tracking, the ball)
  function draw(ball?: { x: number; y: number; w: number; h: number } | null) {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (rim) {
      ctx.strokeStyle = '#f97316';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(rim.x * canvas.width, rim.y * canvas.height, (rimWidth / 2) * canvas.width, (rimWidth / 6) * canvas.width, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (ball) {
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 2;
      ctx.strokeRect(ball.x * canvas.width, ball.y * canvas.height, ball.w * canvas.width, ball.h * canvas.height);
    }
  }

  useEffect(() => {
    if (step === 'calibrate') draw(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rim, rimWidth, step]);

  async function startTracking() {
    const video = videoRef.current;
    if (!video || !rim) return;
    setError(null);
    setStatus('Loading the ball tracker (first time takes a few seconds)…');
    let detector;
    try {
      detector = await getBallDetector();
    } catch {
      setStatus(null);
      setError('Could not load the ball tracker. Check your connection and try again.');
      return;
    }
    setStatus(null);
    setShots([]);
    setStep('tracking');
    stopRef.current = false;

    const nav = navigator as Navigator & { wakeLock?: { request: (t: 'screen') => Promise<{ release: () => Promise<void> }> } };
    nav.wakeLock?.request('screen').then((l) => (lockRef.current = l)).catch(() => undefined);

    const shotDetector = new ShotDetector({ ...rim, width: rimWidth });
    const startedAt = performance.now();
    let lastTs = -1;
    let nextId = 1;

    if (source === 'file') {
      video.currentTime = 0;
      video.playbackRate = speed;
      await video.play().catch(() => undefined);
    }

    const processFrame = () => {
      if (stopRef.current) return;
      if (source === 'file' && video.ended) {
        finish();
        return;
      }
      if (video.readyState >= 2 && video.videoWidth > 0) {
        // MediaPipe needs strictly increasing timestamps
        const ts = Math.max(lastTs + 1, Math.round(performance.now()));
        lastTs = ts;
        const result = detector.detectForVideo(video, ts);
        const best = [...(result.detections || [])].sort(
          (a, b) => (b.categories[0]?.score || 0) - (a.categories[0]?.score || 0)
        )[0];
        const box = best?.boundingBox;
        const ball = box
          ? {
              x: box.originX / video.videoWidth,
              y: box.originY / video.videoHeight,
              w: box.width / video.videoWidth,
              h: box.height / video.videoHeight,
            }
          : null;
        const t = source === 'file' ? video.currentTime * 1000 : performance.now() - startedAt;
        const shot = shotDetector.push({ t, ball: ball ? { x: ball.x + ball.w / 2, y: ball.y + ball.h / 2 } : null });
        if (shot) {
          setShots((cur) => [...cur, { ...shot, id: nextId++ }]);
          navigator.vibrate?.(shot.made ? 40 : [20, 50, 20]);
        }
        draw(ball);
        setElapsedMs(t);
        if (source === 'file' && video.duration) setProgress(video.currentTime / video.duration);
      }
      const v = video as HTMLVideoElement & { requestVideoFrameCallback?: (cb: () => void) => number };
      if (v.requestVideoFrameCallback) v.requestVideoFrameCallback(processFrame);
      else requestAnimationFrame(processFrame);
    };
    processFrame();
  }

  function finish() {
    stopRef.current = true;
    videoRef.current?.pause();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    lockRef.current?.release().catch(() => undefined);
    setStep('review');
  }

  function toggleShot(id: number) {
    setShots((cur) => cur.map((s) => (s.id === id ? { ...s, made: !s.made, confident: true } : s)));
  }

  function addShot(made: boolean) {
    setShots((cur) => [...cur, { id: Date.now(), t: elapsedMs, made, confident: true }]);
  }

  async function saveSession() {
    if (shots.length === 0) {
      setError('There are no shots to save.');
      return;
    }
    setSaving(true);
    setError(null);
    const supabase = createClient() as any;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login');
      return;
    }
    const makes = shots.filter((s) => s.made).length;
    const minutes = Math.min(360, Math.max(5, Math.round(elapsedMs / 60000)));
    const today = new Date();
    const date = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    const { data: session, error: sessionError } = await supabase
      .from('training_sessions')
      .insert({
        user_id: user.id,
        session_date: date,
        session_type: 'shooting',
        duration_minutes: minutes,
        intensity_rpe: 6,
        perceived_quality: 3,
        notes: `Tracked with HoopIQ video shot tracking (${source === 'camera' ? 'live camera' : 'video'})`,
      })
      .select('id')
      .single();
    if (sessionError || !session) {
      setError(`Could not save the session: ${sessionError?.message || 'unknown error'}`);
      setSaving(false);
      return;
    }
    const { data: drill, error: drillError } = await supabase
      .from('session_drills')
      .insert({ session_id: session.id, user_id: user.id, drill_name: 'Video shot tracking', drill_category: 'shooting', duration_minutes: minutes })
      .select('id')
      .single();
    const { error: entryError } = drill
      ? await supabase.from('shooting_entries').insert({ drill_id: drill.id, user_id: user.id, shot_zone: zone, makes, attempts: shots.length })
      : { error: drillError };
    if (drillError || entryError) {
      await supabase.from('training_sessions').delete().eq('id', session.id);
      setError('Could not save your shots. Nothing was saved, please try again.');
      setSaving(false);
      return;
    }
    await supabase.from('video_analyses').insert({
      user_id: user.id,
      kind: 'shot_tracking',
      session_id: session.id,
      summary: { source, zone, makes, attempts: shots.length, shots: shots.map((s) => ({ t: Math.round(s.t), made: s.made })) },
    });
    router.push(`/basketball/${session.id}`);
  }

  const makes = shots.filter((s) => s.made).length;

  return (
    <div className="space-y-4">
      {error && <Alert variant="error" title="Check this">{error}</Alert>}
      {status && <p className="text-sm text-zinc-400">{status}</p>}

      {step === 'source' && (
        <div className="space-y-3">
          <p className="text-sm text-zinc-300">
            Put your phone on a tripod or against a wall with the <strong>whole hoop in view</strong>, side-on or behind you. Good light helps.
            Your video stays on your phone.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button type="button" onClick={openCamera} className="flex items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 text-left hover:bg-zinc-900">
              <Camera className="h-6 w-6 text-orange-400" />
              <div>
                <div className="font-semibold text-white">Live camera</div>
                <div className="text-xs text-zinc-500">Counts shots as you shoot, any length</div>
              </div>
            </button>
            <label className="flex items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 cursor-pointer hover:bg-zinc-900">
              <FileVideo className="h-6 w-6 text-orange-400" />
              <div>
                <div className="font-semibold text-white">Video from your phone</div>
                <div className="text-xs text-zinc-500">Analysed on your phone, any size</div>
              </div>
              <input type="file" accept="video/*" className="hidden" onChange={(e) => e.target.files?.[0] && openFile(e.target.files[0])} />
            </label>
          </div>
        </div>
      )}

      {step !== 'source' && step !== 'review' && (
        <div className="relative w-full overflow-hidden rounded-2xl bg-black">
          <video ref={videoRef} playsInline muted className="w-full h-auto" />
          <canvas ref={canvasRef} onClick={tapRim} className="absolute inset-0 h-full w-full touch-manipulation" />
          {step === 'tracking' && (
            <div className="absolute left-2 top-2 rounded-xl bg-black/70 px-3 py-2 text-white">
              <div className="text-2xl font-black">
                {makes}/{shots.length}
              </div>
              <div className="text-xs text-zinc-300">{shots.length ? Math.round((makes / shots.length) * 100) : 0}%</div>
            </div>
          )}
        </div>
      )}

      {step === 'calibrate' && (
        <div className="space-y-3">
          <p className="text-sm text-zinc-300 flex items-center gap-2">
            <Crosshair className="h-4 w-4 text-orange-400" /> Tap the centre of the rim, then size the orange ring to match it.
          </p>
          <label className="block text-xs text-zinc-400">
            Rim size
            <input type="range" min={0.02} max={0.25} step={0.005} value={rimWidth} onChange={(e) => setRimWidth(Number(e.target.value))} className="w-full accent-orange-500" />
          </label>
          {source === 'file' && (
            <label className="text-xs text-zinc-400 flex items-center gap-2">
              Analysis speed
              <select value={speed} onChange={(e) => setSpeed(Number(e.target.value))} className="rounded-lg bg-zinc-900 border border-zinc-800 px-2 py-1 text-white">
                <option value={1}>1x (most accurate)</option>
                <option value={2}>2x (faster, may miss quick shots)</option>
              </select>
            </label>
          )}
          <Button variant="primary" size="lg" className="w-full" disabled={!rim} onClick={startTracking}>
            Start tracking
          </Button>
        </div>
      )}

      {step === 'tracking' && (
        <div className="space-y-2">
          {source === 'file' && (
            <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
              <div className="h-full bg-orange-500" style={{ width: `${Math.round(progress * 100)}%` }} />
            </div>
          )}
          <p className="text-xs text-zinc-500 flex items-center gap-1.5">
            <Activity className="h-3.5 w-3.5" /> {clock(elapsedMs)} · green box = ball found
          </p>
          <Button variant="secondary" size="lg" className="w-full gap-2" onClick={finish}>
            <Square className="h-4 w-4" /> {source === 'camera' ? 'Stop and review' : 'Stop early and review'}
          </Button>
        </div>
      )}

      {step === 'review' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 text-center">
            <div className="text-4xl font-black text-orange-400">
              {makes}/{shots.length}
            </div>
            <div className="text-sm text-zinc-400">{shots.length ? Math.round((makes / shots.length) * 100) : 0}% · tap a shot to switch make/miss</div>
          </div>

          <div className="space-y-1.5 max-h-80 overflow-y-auto">
            {shots.map((s, i) => (
              <div key={s.id} className="flex items-center gap-2 rounded-lg bg-zinc-900/70 px-3 py-2 text-sm">
                <span className="w-8 text-zinc-500">#{i + 1}</span>
                <span className="w-12 text-zinc-500">{clock(s.t)}</span>
                <button type="button" onClick={() => toggleShot(s.id)} className={`flex-1 rounded-md py-1 font-semibold ${s.made ? 'bg-emerald-600/20 text-emerald-300' : 'bg-red-600/20 text-red-300'}`}>
                  {s.made ? 'Make' : 'Miss'}
                  {!s.confident && <span className="text-xs text-zinc-400"> (check)</span>}
                </button>
                {source === 'file' && onCheckForm && fileRef.current && (
                  <button type="button" onClick={() => onCheckForm(fileRef.current!, s.t)} className="text-xs text-cyan-400 underline">
                    Form
                  </button>
                )}
                <button type="button" onClick={() => setShots((cur) => cur.filter((x) => x.id !== s.id))} aria-label={`Delete shot ${i + 1}`} className="text-zinc-500 hover:text-red-400">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
            {shots.length === 0 && <p className="text-sm text-zinc-500">No shots were detected. Check the hoop was in view and the rim ring matched it.</p>}
          </div>

          <div className="flex gap-2">
            <button type="button" onClick={() => addShot(true)} className="flex-1 flex items-center justify-center gap-1 rounded-lg bg-zinc-800 py-2 text-xs font-semibold text-zinc-200">
              <Plus className="h-3.5 w-3.5" /> Add a make it missed
            </button>
            <button type="button" onClick={() => addShot(false)} className="flex-1 flex items-center justify-center gap-1 rounded-lg bg-zinc-800 py-2 text-xs font-semibold text-zinc-200">
              <Plus className="h-3.5 w-3.5" /> Add a miss it missed
            </button>
          </div>

          <label className="block text-sm text-zinc-300">
            Where were you shooting from?
            <select value={zone} onChange={(e) => setZone(e.target.value as CourtZone | 'all-around')} className="mt-1 w-full rounded-xl bg-zinc-900 border border-zinc-800 px-3 py-2 text-white">
              <option value="all-around">{ZONE_LABELS['all-around']} (moving around)</option>
              {(Object.keys(ZONE_SPOTS) as CourtZone[]).map((z) => (
                <option key={z} value={z}>
                  {ZONE_LABELS[z]}
                </option>
              ))}
            </select>
          </label>

          <Button variant="primary" size="lg" className="w-full" isLoading={saving} onClick={saveSession}>
            Save as a Hoops session
          </Button>
          <button type="button" onClick={() => { setShots([]); setRim(null); setStep('source'); }} className="w-full text-center text-xs text-zinc-500">
            Start over
          </button>
        </div>
      )}
    </div>
  );
}
