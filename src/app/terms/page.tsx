// src/app/terms/page.tsx
import React from 'react';
import Link from 'next/link';

export const metadata = { title: 'Terms of Use - HoopIQ' };

const LAST_UPDATED = 'September 25, 2026';

export default function TermsPage() {
  const contactEmail = process.env.SUPPORT_EMAIL || process.env.OWNER_EMAIL;

  return (
    <div className="flex-1 bg-zinc-950 px-6 py-12">
      <main className="mx-auto max-w-2xl space-y-6 text-sm leading-6 text-zinc-300">
        <Link href="/" className="text-xs text-zinc-500 hover:text-zinc-300">← HoopIQ</Link>
        <h1 className="text-3xl font-black text-white">Terms of Use</h1>
        <p className="text-xs text-zinc-500">Last updated: {LAST_UPDATED}</p>
        <p>
          These terms cover your use of HoopIQ AI Basketball Trainer (&ldquo;HoopIQ&rdquo;), the app and website. By
          creating an account you agree to them. If you do not agree, please do not use HoopIQ.
        </p>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-white">Who can use HoopIQ</h2>
          <p>
            You must be 13 or older. If you are under 18, please make sure a parent or guardian is happy for you to
            use HoopIQ and has read these terms with you. You are responsible for keeping your login details safe.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-white">Train safely</h2>
          <p>
            Basketball and strength training carry a risk of injury. HoopIQ gives general training information, not
            medical advice. Warm up, use good technique, choose weights you can control and stop if you feel pain,
            dizziness or unusual discomfort. Talk to a doctor or physiotherapist before starting a new programme if you
            have an injury or a health condition. You train at your own risk.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-white">AI coaching and video analysis</h2>
          <p>
            AI feedback, shot counts, form measurements and NBA style matches are generated automatically and can be
            wrong. Treat them as a guide, not as professional coaching, medical or scouting advice. Video analysis runs
            on your own device; only the numbers you choose are sent to our AI provider when you ask for feedback.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-white">HoopIQ Pro</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Pro is a paid subscription, billed monthly or yearly through Stripe at the price shown before you pay.</li>
            <li>It renews automatically until you cancel. You can cancel any time in Profile → HoopIQ Pro → Manage subscription; you keep Pro until the end of the period you paid for.</li>
            <li>
              If you live in the EU or UK you can cancel a new subscription within 14 days of buying it and get a
              refund by contacting us{contactEmail ? ` at ${contactEmail}` : ''}.
            </li>
            <li>We will tell you before changing the price of your subscription, and you can cancel before it applies.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-white">Your content</h2>
          <p>
            You own the training data, notes and videos you add. You give us permission to store and process them only
            to run HoopIQ for you (for example to show your progress or create the feedback you ask for). Only upload
            videos you have the right to use, and do not film other people without their permission.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-white">Fair play</h2>
          <p>
            Do not misuse HoopIQ: no fake entries to climb the leaderboard, offensive display names, attempts to access
            other players&apos; data, or attempts to break or overload the service. We may remove leaderboard entries or
            suspend accounts that break these rules.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-white">The service</h2>
          <p>
            We work hard to keep HoopIQ running, but we cannot promise it will always be available or error-free, and we
            may change or remove features. You can download your data (Profile → Download my data) or delete your
            account at any time.
          </p>
          <p>
            Nothing in these terms limits rights you have under consumer law. Apart from those rights, and to the extent
            the law allows, HoopIQ is provided &ldquo;as is&rdquo; and we are not responsible for indirect losses or
            injuries that come from how you train.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-white">Changes and law</h2>
          <p>
            If we change these terms in an important way we will tell you in the app. These terms are governed by the
            laws of Ireland. If you live elsewhere in the EU you keep the protection of your own country&apos;s consumer
            laws and can bring a claim there.
          </p>
        </section>

        {contactEmail && (
          <section className="space-y-2">
            <h2 className="text-lg font-bold text-white">Contact</h2>
            <p>
              Questions: <a className="text-orange-400 underline" href={`mailto:${contactEmail}`}>{contactEmail}</a>
            </p>
          </section>
        )}

        <p className="text-xs text-zinc-500">
          See also our <Link href="/privacy" className="underline">Privacy Policy</Link>.
        </p>
      </main>
    </div>
  );
}
