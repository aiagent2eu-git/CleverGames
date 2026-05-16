# PLAN: Daily Puzzles

**Date:** 2026-05-16  
**Related SPEC:** `doc/specs/daily-puzzles/SPEC.md`

## 1. Architecture

The app is a client-rendered React/Vite game. Challenges are deterministic from the local date key so the same day produces the same Sudoku, Numbers, and Letters challenges for all players in the same timezone.

## 2. Components

- `GameTabs`: Switches between Sudoku, Cifras, and Letras.
- `LevelSelector`: Shows the 10 Sudoku daily levels.
- `SudokuGame`: Board, keypad, validation, scoring, save.
- `NumbersGame`: Number tiles, expression parser, scoring, save.
- `LettersGame`: Letter tiles, dictionary validation, scoring, save.
- `DailyLeaderboard`: Reads daily results for active game/date/level.

## 3. Data Model

`daily_results` stores public daily scores:

- `player_name`
- `challenge_date`
- `game_type`
- `difficulty`
- `score`
- `duration_ms`
- `metadata`

## 4. Security

RLS is enabled. Public select and insert are open for the starter version; update and delete remain denied. Future hardening should use auth or an Edge Function.

## 5. Rollout

1. Run SQL migration in Supabase.
2. Add Vercel environment variables.
3. Push to GitHub.
4. Deploy through Vercel.
5. Replace local dictionary with a production dictionary.
