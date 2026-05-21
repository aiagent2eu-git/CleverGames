-- ============================================
-- Migration: List authenticated user's groups through RPC
-- Author: AI Agent
-- Date: 2026-05-21
-- ============================================

CREATE OR REPLACE FUNCTION public.list_my_groups()
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  owner_id UUID,
  invite_code TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  role TEXT,
  joined_at TIMESTAMPTZ
) AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  RETURN QUERY
  SELECT
    g.id,
    g.name,
    g.description,
    g.owner_id,
    g.invite_code,
    g.created_at,
    g.updated_at,
    gm.role,
    gm.joined_at
  FROM public.group_members gm
  JOIN public.groups g
    ON g.id = gm.group_id
  WHERE gm.user_id = auth.uid()
  ORDER BY gm.joined_at DESC, g.created_at DESC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, auth;

GRANT EXECUTE ON FUNCTION public.list_my_groups() TO authenticated;

NOTIFY pgrst, 'reload schema';

-- ============================================
-- ROLLBACK
-- ============================================

/*
DROP FUNCTION IF EXISTS public.list_my_groups();
NOTIFY pgrst, 'reload schema';
*/
