-- ============================================
-- Migration: Create Spanish dictionary words table
-- Author: AI Agent
-- Date: 2026-05-25
-- ============================================

CREATE TABLE IF NOT EXISTS public.dictionary_words (
  normalized_word TEXT PRIMARY KEY,
  display_word TEXT NOT NULL,
  word_length INTEGER NOT NULL,
  source TEXT NOT NULL DEFAULT 'dictionary-es',
  is_allowed BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT dictionary_words_normalized_check CHECK (
    normalized_word ~ '^[A-Z]+$'
    AND length(normalized_word) BETWEEN 2 AND 9
  ),
  CONSTRAINT dictionary_words_length_check CHECK (
    word_length = length(normalized_word)
  )
);

COMMENT ON TABLE public.dictionary_words IS 'Spanish word list for the daily Letters game.';
COMMENT ON COLUMN public.dictionary_words.normalized_word IS 'Uppercase word with accents removed and ñ treated as n.';
COMMENT ON COLUMN public.dictionary_words.display_word IS 'Lowercase display form from the source dictionary.';
COMMENT ON COLUMN public.dictionary_words.source IS 'Dictionary source, initially dictionary-es from sbosio/rla-es.';

CREATE INDEX IF NOT EXISTS idx_dictionary_words_length_allowed
  ON public.dictionary_words (word_length, normalized_word)
  WHERE is_allowed;

ALTER TABLE public.dictionary_words ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS dictionary_words_select_allowed ON public.dictionary_words;
CREATE POLICY dictionary_words_select_allowed ON public.dictionary_words
  FOR SELECT
  TO authenticated
  USING (is_allowed);

-- No INSERT/UPDATE/DELETE policies are created. Import and moderation are admin-side operations.

NOTIFY pgrst, 'reload schema';

-- ============================================
-- ROLLBACK
-- ============================================

/*
DROP POLICY IF EXISTS dictionary_words_select_allowed ON public.dictionary_words;
DROP INDEX IF EXISTS public.idx_dictionary_words_length_allowed;
DROP TABLE IF EXISTS public.dictionary_words;
NOTIFY pgrst, 'reload schema';
*/
