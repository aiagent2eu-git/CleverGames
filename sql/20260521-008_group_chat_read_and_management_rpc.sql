-- ============================================
-- Migration: Read group chat and manage memberships through RPC
-- Author: AI Agent
-- Date: 2026-05-21
-- ============================================

CREATE OR REPLACE FUNCTION public.list_group_messages(
  target_group_id UUID,
  message_limit INTEGER DEFAULT 100
)
RETURNS SETOF public.group_messages AS $$
DECLARE
  safe_limit INTEGER;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT public.is_group_member(target_group_id, auth.uid()) THEN
    RAISE EXCEPTION 'You are not a member of this group';
  END IF;

  safe_limit := greatest(1, least(coalesce(message_limit, 100), 200));

  RETURN QUERY
  SELECT *
  FROM public.group_messages
  WHERE group_id = target_group_id
  ORDER BY created_at ASC
  LIMIT safe_limit;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, auth;

CREATE OR REPLACE FUNCTION public.leave_group(target_group_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.groups
    WHERE id = target_group_id
      AND owner_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Group owner cannot leave the group';
  END IF;

  IF NOT public.is_group_member(target_group_id, auth.uid()) THEN
    RAISE EXCEPTION 'You are not a member of this group';
  END IF;

  DELETE FROM public.group_members
  WHERE group_id = target_group_id
    AND user_id = auth.uid();

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

CREATE OR REPLACE FUNCTION public.delete_group(target_group_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.groups
    WHERE id = target_group_id
      AND owner_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Only the group owner can delete this group';
  END IF;

  DELETE FROM public.groups
  WHERE id = target_group_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

GRANT EXECUTE ON FUNCTION public.list_group_messages(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.leave_group(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_group(UUID) TO authenticated;

NOTIFY pgrst, 'reload schema';

-- ============================================
-- ROLLBACK
-- ============================================

/*
DROP FUNCTION IF EXISTS public.delete_group(UUID);
DROP FUNCTION IF EXISTS public.leave_group(UUID);
DROP FUNCTION IF EXISTS public.list_group_messages(UUID, INTEGER);
NOTIFY pgrst, 'reload schema';
*/
