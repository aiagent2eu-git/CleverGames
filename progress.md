Original prompt: quiero crear un juego en web react/vite y app de android, aunque empezaremos por la web, con bbdd supabase, en github y en vercel.

## 2026-05-16

- Created initial React/Vite/TypeScript structure for a web game.
- Chosen first scope: web-first canvas arcade starter, Supabase leaderboard, Vercel-ready config.
- Git branch creation was attempted but blocked by sandbox permissions on `.git`; work continued on the current branch.
- Build and lint passed after installing dependencies.
- Playwright verification passed on desktop/mobile layout and gameplay state after Chromium was installed outside the sandbox.
- Replaced arcade starter with the real product direction: daily Sudoku with 10 levels, daily Cifras, daily Letras, and `daily_results` Supabase migration.
- Verified build, lint, desktop/mobile tabs, Cifras/Letras validation, and all 10 Sudoku levels.
- Added email-auth user architecture, private groups, group chat, group-scoped daily results, and SQL migration `20260518-002_create_social_groups_auth.sql`.
- Strengthened `.gitignore` and README so credentials stay out of Git while SQL schema remains clonable.
- Verified social demo flow with Playwright: create group, select group, send chat, validate/save group result, desktop/mobile responsive.

## TODO

- Run `sql/20260516-001_create_daily_results.sql` and `sql/20260518-002_create_social_groups_auth.sql` in the Supabase project.
- Enable Email provider in Supabase Auth and configure local/production redirect URLs.
- Add `VITE_SUPABASE_ANON_KEY` locally and in Vercel.
- Push to the chosen Git remote once git writes are permitted.
- Deploy to Vercel after Supabase environment variables are available.
- Build Android, iOS, and Stick TV wrappers after responsive web QA; keep the web app as the shared core.
