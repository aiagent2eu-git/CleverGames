# TASKS: Web Game Starter

**Date:** 2026-05-16  
**Related to:** `SPEC.md` and `PLAN.md`  
**Total Estimate:** 1 day starter slice

## Phase 1: Project Foundation

### Task 1.1: Create React/Vite structure

**Status:** Completed

**DoD:**
- [x] Package scripts exist.
- [x] TypeScript config exists.
- [x] Vite config exists.

### Task 1.2: Add deployment and environment files

**Status:** Completed

**DoD:**
- [x] `.env.example` documents Supabase variables.
- [x] `vercel.json` exists.
- [x] README includes Vercel setup.

## Phase 2: Game

### Task 2.1: Implement canvas game loop

**Status:** Completed

**DoD:**
- [x] Game can start, run, and end.
- [x] Keyboard and touch controls exist.
- [x] Fullscreen control exists.

### Task 2.2: Add deterministic test hooks

**Status:** Completed

**DoD:**
- [x] `window.render_game_to_text()` returns current game state.
- [x] `window.advanceTime(ms)` advances simulation.

## Phase 3: Supabase

### Task 3.1: Create database migration

**Status:** Completed

**DoD:**
- [x] `scores` table exists in SQL migration.
- [x] RLS is enabled.
- [x] Rollback SQL is documented.

### Task 3.2: Create frontend service layer

**Status:** Completed

**DoD:**
- [x] Components do not import Supabase directly.
- [x] Score service validates inputs.
- [x] Local fallback works when env vars are missing.

## Phase 4: External Setup

### Task 4.1: Create GitHub remote

**Status:** Pending

**DoD:**
- [ ] Remote exists.
- [ ] Initial commit pushed.

### Task 4.2: Deploy to Vercel

**Status:** Pending

**DoD:**
- [ ] Vercel project linked to GitHub.
- [ ] Supabase env vars configured.
- [ ] Production URL verified.
