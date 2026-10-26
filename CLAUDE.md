# Count Me In

Men-only activity partner app for Adelaide. Users post a callout for a sport or outdoor activity, other men tap "Count me in", they meet up and confirm the meetup with a QR scan.

## Read first
- `guidelines/Guidelines.md`: design system (tokens, typography, components). Follow it for every UI change.
- `guidelines/app-spec.md`: product spec (screens, flows, activity presets, rules, mock data).
- `docs/build-plan.md`: the phases. Check which phase we are in before starting work.

## About the owner
Jai is a UX/UI designer, not a developer. He does not write code himself.
- Explain what you are doing and why in plain Dutch, short and step by step.
- When Jai needs to do something himself (create an account, click a button in a dashboard, paste a key), give numbered steps with exact button names.
- Never assume he knows terminal commands. If he must run one, give the exact command and say what it does.
- After each finished task, tell him how to check it (what to open, what he should see).

## Tech stack
- React + Vite + TypeScript + Tailwind (the code exported from Figma Make). Do not migrate to another framework unless Jai asks.
- React Router for screens.
- Supabase (free plan) for database, login, file storage and realtime chat. Added from phase 2.
- Hosting on Vercel (Hobby plan), deployed automatically from GitHub on every push to `main`.
- Installable as a PWA (web app on the home screen). No native app store builds.

## Hard rules: stay on free plans
- Vercel Hobby is for personal, non-commercial use. Do not add ads, payments or anything that earns money.
- Do not add any paid service or API (no SMS providers, no paid verification, no paid maps or AI APIs). If a feature needs one, stop and explain the options and costs to Jai first.
- No Vercel cron jobs, no long-running serverless functions. Prefer doing work in the browser with Supabase and Row Level Security.
- Keep the database small: compress and resize profile photos in the browser before upload (max 800px, JPEG/WebP around 80% quality). Text-only chat.
- Login with email (one-time code or magic link), not SMS. Phone and selfie verification stay simulated in the UI.

## Code rules
- Use the design tokens (CSS variables) from Guidelines.md. Never hard-code colours.
- Reuse components in `src/components/`. One screen per file in `src/screens/`.
- Keep secrets out of git: Supabase keys live in `.env.local` (git-ignored) and in Vercel environment variables. Only the public anon key may be used in the browser.
- Every Supabase table has Row Level Security enabled with explicit policies.
- Make small, working steps. After each step: run the app, check there are no errors, then commit with a clear message.
- Do not add features that are not in app-spec.md or the current phase without asking.
