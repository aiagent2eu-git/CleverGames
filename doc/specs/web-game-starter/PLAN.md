# PLAN: Web Game Starter

**Date:** 2026-05-16  
**Related SPEC:** `doc/specs/web-game-starter/SPEC.md`

## 1. Executive Summary

Build a web-first React/Vite game starter with a canvas game loop, Supabase-backed leaderboard, SQL migration, and Vercel-ready configuration. Overall risk is medium because the database and deployment require external project credentials.

## 2. Detailed Architecture

```text
Browser
  |
  v
React App
  |-- GameCanvas: owns canvas, input, animation frame, test hooks
  |-- LeaderboardPanel: owns player name, submit, refresh
  |-- game/engine.ts: deterministic state updates and collision logic
  |-- game/render.ts: canvas drawing only
  |-- services/scoreService.ts: validation, local fallback, Supabase calls
  `-- lib/supabaseHandler.ts: single Supabase client boundary
```

## 3. Data Model

### Table: `scores`

| Field | Type | Nullable | Default | Comment |
| --- | --- | --- | --- | --- |
| `id` | UUID | No | `gen_random_uuid()` | Primary key |
| `player_name` | TEXT | No | - | Public display name |
| `score` | INTEGER | No | - | Final game score |
| `survival_ms` | INTEGER | No | 0 | Survival duration |
| `created_at` | TIMESTAMPTZ | No | `now()` | Submission date |

Indexes:

- `idx_scores_score_created_at` on `(score DESC, created_at ASC)`
- `idx_scores_created_at` on `(created_at DESC)`

## 4. Security and RLS

Strategy: deny by default except public read and insert for the starter leaderboard.

Policies:

- `scores_select_public`: anon/authenticated can read scores.
- `scores_insert_public`: anon/authenticated can insert only rows that pass constraints.
- No update/delete policies.

Future hardening:

- Require Supabase Auth for score submission.
- Move score writes to an Edge Function.
- Add rate limiting and basic anti-cheat checks.

## 5. Testing Plan

- Run `npm run build`.
- Run local dev server and verify the first screen renders.
- Use browser/game hooks:
  - `window.render_game_to_text()`
  - `window.advanceTime(ms)`
- In Supabase, run migration and verify:
  - anonymous SELECT works
  - anonymous INSERT works with valid data
  - UPDATE and DELETE fail

## 6. Rollout

1. Push repo to GitHub.
2. Create Supabase project and run migration.
3. Add Vercel project linked to GitHub.
4. Add Vercel env vars from `.env.example`.
5. Deploy web app.
6. After game concept stabilizes, add Android packaging via Capacitor.
