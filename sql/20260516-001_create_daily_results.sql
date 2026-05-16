-- ============================================
-- Migration: Create daily puzzle results
-- Author: AI Agent
-- Date: 2026-05-16
-- ============================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================
-- 1. TABLES
-- ============================================

CREATE TABLE IF NOT EXISTS daily_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_name TEXT NOT NULL,
  challenge_date DATE NOT NULL,
  game_type TEXT NOT NULL,
  difficulty INTEGER,
  score INTEGER NOT NULL,
  duration_ms INTEGER NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT daily_results_player_name_length CHECK (
    length(trim(player_name)) BETWEEN 2 AND 24
  ),
  CONSTRAINT daily_results_game_type_check CHECK (
    game_type IN ('sudoku', 'numbers', 'letters')
  ),
  CONSTRAINT daily_results_difficulty_check CHECK (
    difficulty IS NULL OR difficulty BETWEEN 1 AND 10
  ),
  CONSTRAINT daily_results_score_range CHECK (
    score >= 0 AND score <= 999999
  ),
  CONSTRAINT daily_results_duration_range CHECK (
    duration_ms >= 0 AND duration_ms <= 86400000
  )
);

COMMENT ON TABLE daily_results IS 'Public daily puzzle leaderboard results for CleverGames.';
COMMENT ON COLUMN daily_results.challenge_date IS 'Local daily challenge date in YYYY-MM-DD form.';
COMMENT ON COLUMN daily_results.game_type IS 'Puzzle type: sudoku, numbers, or letters.';
COMMENT ON COLUMN daily_results.difficulty IS 'Sudoku level from 1 to 10; null for numbers and letters.';
COMMENT ON COLUMN daily_results.metadata IS 'Small public gameplay summary, such as expression or submitted word.';

-- ============================================
-- 2. INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_daily_results_lookup
  ON daily_results (challenge_date DESC, game_type, difficulty, score DESC, duration_ms ASC);

CREATE INDEX IF NOT EXISTS idx_daily_results_created_at
  ON daily_results (created_at DESC);

-- ============================================
-- 3. RLS
-- ============================================

ALTER TABLE daily_results ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS daily_results_select_public ON daily_results;
CREATE POLICY daily_results_select_public ON daily_results
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS daily_results_insert_public ON daily_results;
CREATE POLICY daily_results_insert_public ON daily_results
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    length(trim(player_name)) BETWEEN 2 AND 24
    AND game_type IN ('sudoku', 'numbers', 'letters')
    AND (difficulty IS NULL OR difficulty BETWEEN 1 AND 10)
    AND score >= 0
    AND score <= 999999
    AND duration_ms >= 0
    AND duration_ms <= 86400000
  );

-- No UPDATE or DELETE policies are created. Those operations remain denied by default.

-- ============================================
-- ROLLBACK
-- ============================================

/*
DROP POLICY IF EXISTS daily_results_insert_public ON daily_results;
DROP POLICY IF EXISTS daily_results_select_public ON daily_results;
DROP INDEX IF EXISTS idx_daily_results_created_at;
DROP INDEX IF EXISTS idx_daily_results_lookup;
DROP TABLE IF EXISTS daily_results;
*/
