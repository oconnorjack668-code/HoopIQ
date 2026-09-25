// src/components/video/FilmTagger.tsx
'use client';

import React, { useRef, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { FILM_TAGS, STYLE_TAGS, findMatches, styleFromFilm, MIN_FILM_SHOTS, type NbaPlayer } from '@/lib/styleMatch';
import { FileVideo, Undo2, Users } from 'lucide-react';

interface FilmEvent {
  t: number; // seconds into the video
  type: string;
}

export function FilmTagger({ heightCm, position }: { heightCm: number | null; position: string | null }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasVideo, setHasVideo] = useState(false);
  const [format, setFormat] = useState('1v1');
  const [events, setEvents] = useState<FilmEvent[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedMatch, setSavedMatch] = useState<string[] | null>(null);

  function pick(file: File) {
    setHasVideo(true);
    setEvents([]);
    setSavedMatch(null);
    requestAnimationFrame(() => {
      if (videoRef.current) videoRef.current.src = URL.createObjectURL(file);
    });
  }

  function tag(type: string) {
    setEvents((e) => [...e, { t: Math.round((videoRef.current?.currentTime || 0) * 10) / 10, type }]);
    navigator.vibrate?.(15);
  }

  const counts = new Map<string, number>();
  for (const e of events) counts.set(e.type, (counts.get(e.type) || 0) + 1);
  const film = styleFromFilm(events);

  async function matchFromFilm() {
    if (!heightCm) {
      setError('Add your height in Profile → Edit player info first.');
      return;
    }
    if (film.styleTags.length === 0 && !film.shotProfile) {
      setError(`Tag more plays first (at least 2 of a kind, or ${MIN_FILM_SHOTS} shots).`);
      return;
    }
    setBusy(true);
    setError(null);
    const supabase = createClient() as any;
    const [{ data: players }, { data: auth }] = await Promise.all([supabase.from('nba_players').select('*'), supabase.auth.getUser()]);
    if (!players?.length || !auth?.user) {
      setError('Could not load NBA player profiles.');
      setBusy(false);
      return;
    }
    const input = { heightCm, position, styleTags: film.styleTags, shotProfile: film.shotProfile };
    const top = findMatches(input, players as NbaPlayer[], 3);
    const matches = top.map((m) => ({
      slug: m.player.slug,
      name: m.player.name,
      era: m.player.era,
      position: m.player.position,
      height_cm: m.player.height_cm,
      archetype: m.player.archetype,
      score: m.score,
      height_diff_cm: m.heightDiffCm,
      shared_tags: m.sharedTags,
      strengths: m.player.strengths,
      signature_moves: m.player.signature_moves,
      how_to_copy: m.player.how_to_copy,
      drill_skills: m.player.drill_skills,
    }));
    const styleTagLabels = film.styleTags.map((t) => STYLE_TAGS.find((s) => s.id === t)?.label || t);
    const summary = Object.fromEntries(counts);
    const [{ error: saveError }] = await Promise.all([
      supabase.from('style_match_results').insert({
        user_id: auth.user.id,
        source: 'video',
        input: { ...input, styleTagLabels, film: { format, events: summary } },
        matches,
      }),
      supabase.from('video_analyses').insert({ user_id: auth.user.id, kind: 'game_film', summary: { format, events: summary } }),
    ]);
    setBusy(false);
    if (saveError) {
      setError(`Could not save your match: ${saveError.message}`);
      return;
    }
    setSavedMatch(matches.map((m) => `${m.name} (${m.score}%)`));
  }

  return (
    <div className="space-y-4">
      {error && <Alert variant="error" title="Check this">{error}</Alert>}
      <p className="text-sm text-zinc-300">
        Play back a game against friends and tap a button each time you make a play. HoopIQ turns your tags into a style profile and finds the NBA
        players you play most like.
      </p>

      {!hasVideo ? (
        <label className="flex items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 cursor-pointer hover:bg-zinc-900">
          <FileVideo className="h-6 w-6 text-cyan-400" />
          <div>
            <div className="font-semibold text-white">Choose your game video</div>
            <div className="text-xs text-zinc-500">1v1, 2v2, 3v3 or 5v5. Stays on your phone. Only film people who agreed to it.</div>
          </div>
          <input type="file" accept="video/*" className="hidden" onChange={(e) => e.target.files?.[0] && pick(e.target.files[0])} />
        </label>
      ) : (
        <>
          <video ref={videoRef} controls playsInline className="w-full rounded-2xl bg-black" />
          <div className="flex gap-2">
            {['1v1', '2v2', '3v3', '5v5'].map((f) => (
              <button key={f} type="button" onClick={() => setFormat(f)} className={`flex-1 rounded-lg py-1.5 text-xs font-semibold ${format === f ? 'bg-cyan-600 text-white' : 'bg-zinc-900 text-zinc-400'}`}>
                {f}
              </button>
            ))}
          </div>

          {(['shot', 'offense', 'defense'] as const).map((group) => (
            <div key={group}>
              <div className="text-xs font-semibold uppercase text-zinc-500 mb-1.5">{group === 'shot' ? 'Your shots' : group === 'offense' ? 'Offense' : 'Defense'}</div>
              <div className="grid grid-cols-3 gap-2">
                {FILM_TAGS.filter((t) => t.group === group).map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => tag(t.id)}
                    className={`relative rounded-xl py-3 text-xs font-bold active:scale-95 transition-transform ${
                      t.id.endsWith('_make') ? 'bg-emerald-600/80 text-white' : t.id.endsWith('_miss') ? 'bg-red-600/70 text-white' : 'bg-zinc-800 text-zinc-100'
                    }`}
                  >
                    {t.label}
                    {counts.get(t.id) ? <span className="absolute right-1.5 top-1 text-[10px] text-white/80">{counts.get(t.id)}</span> : null}
                  </button>
                ))}
              </div>
            </div>
          ))}

          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>
              {events.length} plays tagged · {film.shots} shots
            </span>
            <button type="button" onClick={() => setEvents((e) => e.slice(0, -1))} disabled={events.length === 0} className="flex items-center gap-1 disabled:opacity-40">
              <Undo2 className="h-3.5 w-3.5" /> Undo
            </button>
          </div>

          {film.styleTags.length > 0 && (
            <p className="text-sm text-zinc-300">
              Your style so far: {film.styleTags.map((t) => STYLE_TAGS.find((s) => s.id === t)?.label.replace(/^I /, '') || t).join(' · ')}
            </p>
          )}

          <Button variant="primary" size="lg" className="w-full gap-2" isLoading={busy} onClick={matchFromFilm}>
            <Users className="h-4 w-4" /> Find my NBA match from this game
          </Button>

          {savedMatch && (
            <div className="rounded-2xl border border-cyan-600/40 bg-cyan-600/10 p-4 text-sm text-zinc-200">
              <div className="font-bold text-white">You play most like: {savedMatch.join(', ')}</div>
              <Link href="/style-match" className="mt-2 inline-block text-cyan-400 underline">
                See full breakdown, moves to copy and your AI plan
              </Link>
            </div>
          )}
        </>
      )}
    </div>
  );
}
