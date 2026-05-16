# SPEC: Web Game Starter

**Author:** AI Agent  
**Date:** 2026-05-16  
**Status:** Implemented  
**Version:** 1.0

## 1. Context and Motivation

The project needs a web-first game foundation that can later support an Android app, Supabase persistence, GitHub versioning, and Vercel deployment. Starting with a small playable web slice reduces risk before committing to the final game mechanics or mobile packaging.

## 2. Objective

Create a React/Vite/TypeScript starter for CleverGames with a playable canvas game, leaderboard service layer, Supabase schema migration, and Vercel-compatible configuration.

## 3. Non-Objectives

- Final Android app build is not included in this first scope.
- GitHub remote creation and Vercel deployment are not included because account/project credentials are not yet provided.
- Anti-cheat, payments, multiplayer, and user accounts are not included.

## 4. Functional Requirements

### RF-01: Playable Web Game

**Priority:** High  
**Actor:** Player  
**Flow:** Player starts the game, moves horizontally, collects sparks, avoids hazards, and reaches a game-over state.

### RF-02: Leaderboard

**Priority:** High  
**Actor:** Player  
**Flow:** Player enters a name, submits a score, and sees top scores. If Supabase is not configured, a local demo leaderboard is used.

### RF-03: Supabase Integration Boundary

**Priority:** High  
**Actor:** Developer  
**Flow:** UI components call a score service. The score service calls a single Supabase handler.

### RF-04: Deployment Readiness

**Priority:** Medium  
**Actor:** Developer  
**Flow:** Developer can run `npm run build`, deploy `dist` on Vercel, and configure Supabase env vars.

## 5. Acceptance Criteria

- [x] `npm run build` completes successfully.
- [x] The first screen is the playable game interface, not a marketing landing page.
- [x] The game exposes `window.render_game_to_text()` and `window.advanceTime(ms)` for deterministic web-game testing.
- [x] Supabase access is isolated in `src/lib/supabaseHandler.ts` and `src/services/scoreService.ts`.
- [x] A SQL migration exists with RLS enabled for leaderboard scores.
- [x] README documents local, Supabase, Vercel, and Android-next setup.

## 6. Technical Design

### 6.1 Component Architecture

```text
React App
  -> GameCanvas
      -> game/engine.ts
      -> game/render.ts
  -> LeaderboardPanel
      -> services/scoreService.ts
          -> lib/supabaseHandler.ts
              -> Supabase DB
```

### 6.2 Affected Components

- New components: `GameCanvas`, `LeaderboardPanel`
- Services: `scoreService`
- Utilities: `supabaseHandler`
- Game domain: `engine`, `render`, `types`

### 6.3 Data Flow

1. Game ends and emits a final score.
2. App passes score to `LeaderboardPanel`.
3. Player submits a display name.
4. `scoreService.submitScore()` validates and persists.
5. Supabase returns updated leaderboard, or local fallback is used.

## 7. Data and RLS Impact

| Table | Operation | Fields | Migration Required |
| --- | --- | --- | --- |
| `scores` | SELECT, INSERT | `id`, `player_name`, `score`, `survival_ms`, `created_at` | Yes |

RLS is enabled. Public read and insert are allowed for a simple public leaderboard, while update and delete remain denied by default.

## 8. Test Plan

- [x] TypeScript and production build: `npm run build`
- [x] Manual browser check with dev server
- [ ] Supabase SQL execution in a real Supabase project
- [ ] RLS verification against anon/authenticated contexts
- [ ] Future unit tests for score validation and game-state transitions

## 9. Identified Risks

| Risk | Probability | Impact | Mitigation |
| --- | --- | --- | --- |
| Public leaderboard spam | Medium | Medium | Add auth, edge validation, or rate limits later |
| Android packaging reveals canvas/mobile issues | Medium | Medium | Keep controls touch-friendly and test before Capacitor |
| Final game concept diverges from starter | Medium | Low | Keep game engine isolated from app shell |

## 10. Rollback Strategy

Revert the code commit and redeploy the previous Vercel build. For database rollback, drop the `scores` table and related policies as documented in the SQL migration rollback section.

## 11. Dependencies

- Node.js and npm
- Supabase project for persistent leaderboard
- Vercel project for production hosting
- GitHub remote for collaboration and deployment connection
