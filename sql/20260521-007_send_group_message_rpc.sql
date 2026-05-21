-- ============================================
-- Migration: Send group chat messages through RPC
-- Author: AI Agent
-- Date: 2026-05-21
-- ============================================

CREATE OR REPLACE FUNCTION public.send_group_message(
  target_group_id UUID,
  message_body TEXT,
  message_author_name TEXT DEFAULT NULL
)
RETURNS public.group_messages AS $$
DECLARE
  inserted_message public.group_messages;
  cleaned_body TEXT;
  cleaned_author_name TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT public.is_group_member(target_group_id, auth.uid()) THEN
    RAISE EXCEPTION 'You are not a member of this group';
  END IF;

  cleaned_body := left(trim(coalesce(message_body, '')), 800);
  IF length(cleaned_body) < 1 THEN
    RAISE EXCEPTION 'Message body cannot be empty';
  END IF;

  cleaned_author_name := left(trim(coalesce(message_author_name, '')), 40);
  IF length(cleaned_author_name) < 2 THEN
    SELECT left(trim(display_name), 40)
    INTO cleaned_author_name
    FROM public.profiles
    WHERE id = auth.uid();
  END IF;

  IF cleaned_author_name IS NULL OR length(cleaned_author_name) < 2 THEN
    cleaned_author_name := 'Player';
  END IF;

  INSERT INTO public.group_messages (group_id, user_id, author_name, body)
  VALUES (target_group_id, auth.uid(), cleaned_author_name, cleaned_body)
  RETURNING *
  INTO inserted_message;

  RETURN inserted_message;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

GRANT EXECUTE ON FUNCTION public.send_group_message(UUID, TEXT, TEXT) TO authenticated;

NOTIFY pgrst, 'reload schema';

-- ============================================
-- ROLLBACK
-- ============================================

/*
DROP FUNCTION IF EXISTS public.send_group_message(UUID, TEXT, TEXT);
NOTIFY pgrst, 'reload schema';
*/
