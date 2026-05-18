# PLAN: Social Groups and Email Auth

**Date:** 2026-05-18  
**Related SPEC:** `doc/specs/social-groups-auth/SPEC.md`

## 1. Architecture

Email login is handled by Supabase Auth OTP. The frontend reads the current session, mirrors profile data, then lets the player work in personal mode or in a selected group.

## 2. Database

Run migrations in order:

1. `sql/20260516-001_create_daily_results.sql`
2. `sql/20260518-002_create_social_groups_auth.sql`

The second migration removes public starter result policies and replaces them with authenticated, group-aware RLS.

## 3. Frontend

- `AuthPanel`: email code login/logout and local player name.
- `GroupsPanel`: create groups, select active group, join by invite code.
- `GroupChat`: group-scoped chat.
- `DailyLeaderboard`: filtered by date, game, Sudoku level, and selected group.
- Game components: submit `user_id`, `group_id`, and tie-break metadata.

## 4. Platform Apps

The web app is the source of truth. Android/iOS/Stick TV should wrap the responsive web app to reduce duplicate logic. Before native wrappers, validate:

- mobile touch
- desktop keyboard/mouse
- tablet layout
- TV remote focus order
- readable typography at distance

## 5. Security

- No secrets in Git.
- Only `.env.example` is committed.
- Vercel stores production env vars.
- RLS restricts group data to members.
- Chat and results are immutable initially.
