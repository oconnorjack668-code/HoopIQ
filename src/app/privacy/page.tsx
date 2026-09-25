// src/app/privacy/page.tsx
import React from 'react';
import Link from 'next/link';

export const metadata = { title: 'Privacy Policy - HoopIQ' };

const LAST_UPDATED = 'September 25, 2026';

export default function PrivacyPage() {
  const contactEmail = process.env.SUPPORT_EMAIL || process.env.OWNER_EMAIL;

  return (
    <div className="flex-1 bg-zinc-950 px-6 py-12">
      <main className="mx-auto max-w-2xl space-y-6 text-sm leading-6 text-zinc-300">
        <Link href="/" className="text-xs text-zinc-500 hover:text-zinc-300">← HoopIQ</Link>
        <h1 className="text-3xl font-black text-white">Privacy Policy</h1>
        <p className="text-xs text-zinc-500">Last updated: {LAST_UPDATED}</p>
        <p>This policy covers HoopIQ AI Basketball Trainer (&ldquo;HoopIQ&rdquo;), the app and website.</p>

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
            <li>
              Video analysis results: shot counts, form measurements (angles and timings) and film tags. The analysis
              itself runs on your phone, so videos you analyse without uploading never leave your device.
            </li>
            <li>AI coaching reports generated from your session data.</li>
            <li>Programmes, goals, challenges, badges and NBA style match results.</li>
            <li>Reminder settings (time, days, time zone) and, if you turn reminders on, your browser&apos;s push address.</li>
            <li>If you buy Pro: your plan and billing status. Card details are handled by Stripe and never reach us.</li>
            <li>
              Crash reports when something breaks: the error, the page, your device type and your account id, kept for
              90 days and used only to fix bugs.
            </li>
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
              notes), the video numbers you choose to share, or your style match results, only when you ask for AI
              feedback, to write the report. Videos are never sent to OpenAI.
            </li>
            <li>Stripe processes Pro payments.</li>
            <li>Your browser&apos;s push service (for example Google or Apple) delivers training reminders you turn on.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-white">Who can see it</h2>
          <p>
            Your data is private to your account. If you turn on &ldquo;Show me on the leaderboard&rdquo; in your
            profile, other players can see your display name, points, session count and streak, and nothing else.
          </p>
          <p>
            Friends you accept (by friend code) can see your display name, your last 7 days of training totals
            (sessions, minutes, shots made), your streak, and your sessions, workouts and badges from the last 14 days
            as totals. They never see your notes, videos, profile details or AI reports. You can remove a friend at any
            time. Share cards are only created when you tap Share, and you choose where to post them.
          </p>
          <p>
            AI Coach chat messages are stored in your account so the conversation continues; you can clear them at any
            time. Weekly AI reports are created from your own training data and can be turned off in Profile.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-white">Your rights</h2>
          <p>
            You can download a copy of your data at any time from Profile → Download my data, and permanently delete
            your account and all of its data, including uploaded videos, from Profile → Delete account. Under the GDPR
            you can also ask us to correct your data or restrict how we use it, and you can complain to the Irish Data
            Protection Commission (dataprotection.ie).
          </p>
          <p>
            HoopIQ only uses the cookies needed to keep you logged in. Data is stored on servers that may be outside the
            EU; our providers use the EU&apos;s standard contractual clauses to protect it.
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
