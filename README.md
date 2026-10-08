# HoopIQ

A mobile-first basketball player development app: log basketball sessions and
gym work, track goals and streaks, study the game, get AI coaching grounded in
your own logged data, and analyse shooting video on-device.

Next.js 16 (App Router) · TypeScript · Tailwind CSS · Supabase · PWA

## Running it locally

```bash
npm install
cp .env.example .env.local   # then fill in at least the Supabase keys + OWNER_EMAIL
npm run dev
```

You need a Supabase project. Create one, then apply everything in
`supabase/migrations/` in filename order (24 migrations) via the Supabase SQL
editor or the Supabase CLI. They are written to be safe to re-run.

Set `OWNER_EMAIL` to the account that should hold the `owner` role — it grants
unlimited AI credits, Pro features and the admin screens, and is enforced
server-side in `src/lib/auth.ts` (never from a client flag).

`.env.example` documents every variable the code actually reads, and which
features stay dormant without them. AI and Stripe features are optional: with
no key configured they show an honest "not configured" state rather than
fabricating output or silently failing.

## Quality gates

```bash
npm run lint        # eslint
npx tsc --noEmit    # types
npm test            # vitest (25 files, 113 tests)
npm run build       # production build
```

All four are expected to pass. `tsc --noEmit` in particular should stay at zero
errors — the Supabase schema types in `src/lib/supabase/types.ts` are
hand-maintained (there is no `supabase gen types` step), and a schema that
doesn't satisfy the client's `GenericSchema` constraint silently degrades every
query to `never` without any lint error. If you add a table or column in a
migration, add it there too, including its `Relationships: []` entry.

## Layout

```
src/app/(auth)/       login, signup, verify, reset
src/app/(app)/        the app: dashboard, basketball, workouts, goals,
                      ai-coach, study, drills, programs, guides, video,
                      leaderboard, achievements, friends, teams, games,
                      style-match, settings, profile, pro, admin
src/app/api/          route handlers (AI, Stripe webhook, push, crons, share)
src/lib/              auth, supabase clients + schema types, AI providers,
                      offline queue, scoring/stats helpers, video analysis
src/components/       UI primitives and feature components
supabase/migrations/  schema, RLS policies and seed content
__tests__/            unit tests
```

Auth session refresh runs in `src/proxy.ts` (Next.js 16 renamed `middleware` to
`proxy`). Every player-owned table has RLS restricting rows to their owner, and
video is kept in a private bucket.

## On-device video

Shot tracking and form check run entirely in the browser via MediaPipe Tasks
Vision — frames never leave the phone. Shot detection uses a general-purpose
COCO object detector plus rim-crossing geometry, with the player confirming or
correcting every call before it is saved.

Its accuracy has not been measured against labelled footage. Treat the counts as
assistive rather than authoritative, and keep the review step before saving.

## Historical docs

`IMPLEMENTATION.md`, `VERCEL_DEPLOYMENT.md` and `DEPLOYMENT_TESTING.md` date
from the first day of the build and describe a much smaller version of the app
(19 pages, 6 migrations). Useful for shape, unreliable on specifics — this
README and `.env.example` are the current source of truth.
