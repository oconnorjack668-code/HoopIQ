# HoopIQ on Google Play — launch kit

Everything needed to publish **HoopIQ AI Basketball Trainer** on Google Play as a Trusted Web Activity
(the website wrapped as an Android app with PWABuilder). Updates to the website appear in the app
automatically — you only rebuild the app for icon/name/package changes.

Files in this folder:
- `feature-graphic-1024x500.png` — the Play Store feature graphic (required)
- App icon for the store: `public/icon-store-1024.png` (Play wants 512×512 — PWABuilder/Play resize it, or use `public/icon-play-512.png`)

---

## 1. Store listing (copy/paste)

**App name** (max 30): `HoopIQ AI Basketball Trainer`

**Short description** (max 80):
`Track every shot, check your shooting form with AI and train like the pros.`

**Full description** (max 4000):

```
HoopIQ is the all-in-one basketball trainer for players who want to get better every day.

🏀 TRACK EVERY SHOT
• Tap the court to log makes and misses from every zone
• Automatic shot tracking from video: point your phone at the hoop and HoopIQ counts makes, misses and your %
• Shot charts, hot and cold zones, timed shooting challenges and streaks

🎥 AI FORM CHECK
• Film your jumper and see a skeleton overlay of your shot
• Knee bend, elbow angle, release angle, release time, jump height and landing balance
• Video analysis runs on your phone — your videos never leave your device

🤖 AI COACH
• Personal feedback on your sessions: what went well, what to fix, what to do next
• Choose whether the AI looks at your shooting numbers, your mechanics or both

⭐ NBA PLAY STYLE MATCH
• Find out which NBA players your game looks like, adjusted for your height
• Learn their signature moves with drills to copy them

💪 TRAIN WITH A PLAN
• 10 training programmes and 186 guided sessions for shooting, handles, finishing, athleticism and more
• 150+ basketball drills with instructions
• Gym logger organised by muscle group with 160+ exercises, rest timer, previous sets and personal records
• Athletic tests: vertical jump, sprint, agility

🧠 BASKETBALL IQ
• Study sections on offence, defence, reads and rules with quizzes
• Guides on nutrition, recovery, mindset and more

🏆 STAY MOTIVATED
• Weekly challenges, badges and XP ranks from Rookie to GOAT
• Goals, streaks, leaderboard and training reminders
• Works offline in the gym: sessions upload when you're back online

For players aged 13+. HoopIQ Pro unlocks unlimited AI feedback and the AI development plan.
```

**Category:** Sports  **Tags:** Basketball, Fitness, Training
**Contact email:** your support email  **Website:** your Vercel URL
**Privacy policy URL:** `https://<your-site>/privacy`

**Screenshots** (phone, 2–8 images, portrait): take them on your phone from the live app. Suggested order:
1. Dashboard (with the Today card and rank)
2. Shot tracker court with a few shots logged
3. Video → Form check with the skeleton overlay
4. AI Coach report
5. Programs list
6. NBA Style Match results
7. IQ Study quiz
8. Achievements / badges

---

## 2. App content answers (Play Console → Policy → App content)

| Question | Answer |
|---|---|
| Privacy policy | `https://<your-site>/privacy` |
| Ads | **No**, the app has no ads |
| App access | "All or some functionality is restricted" → give a **test login** (create a spare account, e.g. reviewer@…, with some sessions logged) |
| Target audience | **13–15, 16–17, 18+** (do **not** tick under 13) |
| Content rating | Category **Reference/Utility/Sports**; no violence, sex, drugs, gambling. Users interact? **No** (leaderboard shows display names only, no chat) — update this if friends/sharing is added later |
| News app | No |
| Health apps | Tick **"Fitness"** only; not a medical device |
| Financial features | None |
| Government app | No |
| Account deletion | Yes → URL `https://<your-site>/account-deletion` |

### Data safety form

**Does your app collect or share user data?** Yes, collects. **Shared with third parties?** No
(Supabase, Vercel, OpenAI and Stripe are *service providers* processing on your behalf — Google does not count that as sharing.)
**Encrypted in transit?** Yes. **Can users request deletion?** Yes.

| Data type | Collected | Optional? | Purpose |
|---|---|---|---|
| Personal info → Email address | Yes | Required | Account management |
| Personal info → Name (display name) | Yes | Required | App functionality, account management |
| Personal info → User IDs | Yes | Required | Account management |
| Health & fitness → Fitness info | Yes | Required | App functionality, personalisation |
| Photos & videos → Videos | Yes | Optional (only if the player uploads) | App functionality |
| App activity → Other user-generated content (notes) | Yes | Optional | App functionality |
| App info & performance → Crash logs | Yes | Required | Analytics (fixing bugs) |
| Financial info → Purchase history | Yes | Optional (Pro only) | App functionality |

Processed ephemerally? No. Location, contacts, messages, audio, files: **not collected**.

---

## 3. Build the Android app with PWABuilder

1. Merge this branch and wait for Vercel to finish deploying.
2. Go to **https://www.pwabuilder.com**, paste your site URL, click **Start**.
3. Click **Package for stores → Android → Generate package** and open **All settings**:
   - **Package ID:** pick one and never change it, e.g. `app.hoopiq.trainer`
   - **App name:** `HoopIQ AI Basketball Trainer` · **Launcher name:** `HoopIQ`
   - **Start URL:** `/dashboard?app=play` (lets HoopIQ know it's the Play app, so Pro checkout is hidden — Google requires Play Billing for in-app subscriptions)
   - **Theme / background colour:** `#09090b` · **Status bar:** `#09090b`
   - **Signing key:** *Create new* — fill in your name and "Ireland"
4. Download the zip. **Keep `signing.keystore` and `signing-key-info.txt` safe forever** (back them up to Google Drive). Without them you can never update the app.
5. The zip contains `assetlinks.json`. Open it and copy the `sha256_cert_fingerprints` value.

## 4. Connect the app to the website (removes the browser bar)

In **Vercel → Settings → Environment Variables** add:
- `ANDROID_PACKAGE_NAME` = your Package ID (e.g. `app.hoopiq.trainer`)
- `ANDROID_SHA256_FINGERPRINTS` = the fingerprint from step 3.5

After you upload to Play (next step), go to **Play Console → Test and release → Setup → App signing**, copy the
**App signing key certificate SHA-256** and add it to `ANDROID_SHA256_FINGERPRINTS` with a comma:
`AA:BB:...,CC:DD:...`. Redeploy. Check `https://<your-site>/.well-known/assetlinks.json` shows both.

## 5. Publish on Google Play

1. Create a developer account at **https://play.google.com/console** ($25 once, ID verification — use a *personal* account).
2. **Create app** → name `HoopIQ AI Basketball Trainer`, App, Free, accept declarations.
3. Fill in **Store listing** (section 1) and **App content** (section 2).
4. **Testing → Closed testing → Create track**, upload the `.aab` from the PWABuilder zip, add testers by email.
   **New personal accounts must run a closed test with at least 12 testers for 14 days in a row** before
   production access is unlocked — ask teammates, friends and family to join and keep the app installed.
5. After 14 days: **Apply for production** → answer the questions → roll out to production.

## Checklist before you submit
- [ ] Migrations run in Supabase and the branch merged
- [ ] `SUPPORT_EMAIL` set in Vercel (shows on Privacy, Terms and Account deletion pages)
- [ ] `/privacy`, `/terms`, `/account-deletion` open without logging in
- [ ] Test login created for Google's reviewers
- [ ] `assetlinks.json` shows your package and fingerprints
