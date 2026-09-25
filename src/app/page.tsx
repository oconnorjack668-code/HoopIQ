// src/app/page.tsx
import React from 'react';
import { Logo } from '@/components/Logo';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { Target, Sparkles, Trophy } from 'lucide-react';

export const dynamic = 'force-dynamic';

const FEATURES = [
  { icon: Target, title: 'Track every session', desc: 'Shots by zone, drills, workouts and test results.' },
  { icon: Sparkles, title: 'AI coaching feedback', desc: 'Specific next steps after each session.' },
  { icon: Trophy, title: 'Study and compete', desc: 'Basketball IQ quizzes and an opt-in leaderboard.' },
];

export default async function Home() {
  // Signed-in players (including the installed app, which opens at "/") go straight in
  const user = await getCurrentUser();
  if (user) redirect('/dashboard');

  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-zinc-950 px-6 py-16">
      <main className="w-full max-w-md text-center">
        <Logo size={64} className="mx-auto" />
        <h1 className="mt-6 text-4xl font-black tracking-tight text-white">HoopIQ</h1>
        <p className="mt-2 text-zinc-400">Train with intent. See your progress. Improve every day.</p>

        <ul className="mt-10 space-y-4 text-left">
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <li key={f.title} className="flex items-start gap-3 rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
                <Icon className="h-5 w-5 text-orange-400 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-semibold text-white">{f.title}</div>
                  <div className="text-sm text-zinc-400">{f.desc}</div>
                </div>
              </li>
            );
          })}
        </ul>

        <div className="mt-10 flex flex-col gap-3">
          <Link
            href="/signup"
            className="flex h-12 items-center justify-center rounded-xl bg-orange-600 font-semibold text-white hover:bg-orange-500 transition-colors"
          >
            Create an account
          </Link>
          <Link
            href="/login"
            className="flex h-12 items-center justify-center rounded-xl border border-zinc-700 font-semibold text-zinc-200 hover:bg-zinc-900 transition-colors"
          >
            Log in
          </Link>
        </div>

        <p className="mt-8 text-xs text-zinc-500">
          <Link href="/privacy" className="underline hover:text-zinc-300">Privacy policy</Link>
        </p>
      </main>
    </div>
  );
}
