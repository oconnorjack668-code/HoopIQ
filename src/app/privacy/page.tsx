// src/app/privacy/page.tsx
import React from 'react';
import Link from 'next/link';

export const metadata = { title: 'Privacy Policy - HoopIQ' };

const LAST_UPDATED = 'September 24, 2026';

export default function PrivacyPage() {
  const contactEmail = process.env.SUPPORT_EMAIL || process.env.OWNER_EMAIL;

  return (
    <div className="flex-1 bg-zinc-950 px-6 py-12">
      <main className="mx-auto max-w-2xl space-y-6 text-sm leading-6 text-zinc-300">
        <Link href="/" className="text-xs text-zinc-500 hover:text-zinc-300">← HoopIQ</Link>
        <h1 className="text-3xl font-black text-white">Privacy Policy</h1>
        <p className="text-xs text-zinc-500">Last updated: {LAST_UPDATED}</p>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-white">Who HoopIQ is for</h2>
          <p>
            HoopIQ is for players aged 13 and over. We do not knowingly collect information from children under 13.
            If you believe a child under 13 has created an account, contact us and we will delete it.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-white">What we collect</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Account details: your email address and display name.</li>
            <li>Player profile: age bracket, height, position, dominant hand, playing level, goals and focus areas.</li>
            <li>Training data you log: basketball sessions, drills, shots by zone, workouts, sets and performance tests.</li>
            <li>Study activity: quiz scores and lesson progress.</li>
            <li>Videos you choose to upload, with the camera angle and drill type you select.</li>
            <li>AI coaching reports generated from your session data.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-white">How we use it</h2>
          <p>
            To run the app: show your progress, calculate streaks and leaderboard points, and generate coaching
            feedback when you ask for it. We do not sell your data or show ads.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-white">Who processes it</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Supabase stores your account, training data and videos.</li>
            <li>Vercel hosts the app.</li>
            <li>
              OpenAI receives the details of a session (type, duration, intensity, shooting numbers, drills and your
              notes) only when you tap &ldquo;Get AI feedback&rdquo;, to write the report.
            </li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-white">Who can see it</h2>
          <p>
            Your data is private to your account. If you turn on &ldquo;Show me on the leaderboard&rdquo; in your
            profile, other players can see your display name, points, session count and streak, and nothing else.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-white">Deleting your data</h2>
          <p>
            You can permanently delete your account and all of its data, including uploaded videos, at any time from
            Profile → Delete account.
          </p>
        </section>

        {contactEmail && (
          <section className="space-y-2">
            <h2 className="text-lg font-bold text-white">Contact</h2>
            <p>
              Questions about your data: <a className="text-orange-400 underline" href={`mailto:${contactEmail}`}>{contactEmail}</a>
            </p>
          </section>
        )}
      </main>
    </div>
  );
}
