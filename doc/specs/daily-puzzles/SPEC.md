# SPEC: Daily Puzzles

**Author:** AI Agent  
**Date:** 2026-05-16  
**Status:** Implemented  
**Version:** 1.0

## 1. Context and Motivation

CleverGames is a daily puzzle product. The first playable web version must provide repeatable daily challenges before the Android packaging, GitHub publishing, and Vercel deployment work is finalized.

## 2. Objective

Create a web app with 10 daily Sudoku levels, one daily Numbers challenge, one daily Letters challenge, and daily leaderboard persistence through Supabase.

## 3. Non-Objectives

- Native Android packaging is not included in this slice.
- A complete Spanish dictionary service is not included; the first version uses a local provisional dictionary.
- Authentication, anti-cheat, streaks, and social sharing are deferred.

## 4. Functional Requirements

### RF-01: Daily Sudoku

The app generates 10 deterministic Sudoku puzzles per local date, one per difficulty level from 1 to 10. Players can fill, check, reset, and save solved boards.

### RF-02: Daily Numbers

The app generates 6 numbers, a target, validates arithmetic expressions, enforces one-use-per-number, rejects decimal division, and scores exact or approximate results.

### RF-03: Daily Letters

The app generates 9 letters, validates whether a submitted word can be built from them, checks a local dictionary, and scores by word length.

### RF-04: Daily Leaderboard

The app stores and reads daily results from Supabase table `daily_results`, falling back to local storage when Supabase env vars are missing.

## 5. Acceptance Criteria

- [x] Sudoku has exactly 10 selectable levels for the day.
- [x] Numbers validates number reuse and integer-only arithmetic.
- [x] Letters validates letter counts and dictionary membership.
- [x] Results can be saved for each game type.
- [x] SQL migration enables RLS and keeps update/delete denied by default.
- [x] `npm run build` and `npm run lint` pass.

## 6. Technical Design

```text
React App
  -> GameTabs / LevelSelector
  -> SudokuGame
      -> game/sudoku.ts
  -> NumbersGame
      -> game/numbers.ts
  -> LettersGame
      -> game/letters.ts + data/spanishWords.ts
  -> DailyLeaderboard
      -> services/dailyResultService.ts
          -> lib/supabaseHandler.ts
              -> Supabase daily_results
```

## 7. Data and RLS Impact

| Table | Operation | Fields | Migration |
| --- | --- | --- | --- |
| `daily_results` | SELECT, INSERT | `player_name`, `challenge_date`, `game_type`, `difficulty`, `score`, `duration_ms`, `metadata` | `20260516-001_create_daily_results.sql` |

RLS policies allow public select and insert for the first version. Update and delete have no policies.

## 8. Test Plan

- [x] TypeScript production build
- [x] ESLint
- [ ] Run migration in Supabase project
- [ ] Verify anonymous insert/select in Supabase
- [ ] Add unit tests for Sudoku generator, arithmetic parser, and letter validation

## 9. Risks

| Risk | Probability | Impact | Mitigation |
| --- | --- | --- | --- |
| Local dictionary rejects valid Spanish words | High | Medium | Replace with Supabase dictionary or word API |
| Public results can be spammed | Medium | Medium | Add auth, rate limiting, or Edge Function validation |
| Sudoku difficulty is approximate | Medium | Low | Add solver-based rating later |

## 10. Rollback Strategy

Revert the code commit and redeploy the previous Vercel build. To rollback DB, run the rollback block in the SQL migration.
