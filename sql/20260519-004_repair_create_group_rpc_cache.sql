-- ============================================
-- Migration: Repair create_group RPC and reload API cache
-- Author: AI Agent
-- Date: 2026-05-19
-- ============================================

DROP FUNCTION IF EXISTS public.create_group(TEXT, TEXT);

CREATE FUNCTION public.create_group(
  group_name TEXT,
  group_description TEXT
)
RETURNS public.groups AS $$
DECLARE
  created_group public.groups;
  cleaned_name TEXT;
  cleaned_description TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  cleaned_name := left(trim(group_name), 60);
  cleaned_description := nullif(left(trim(coalesce(group_description, '')), 240), '');

  IF length(cleaned_name) < 2 THEN
    RAISE EXCEPTION 'Group name must contain at least 2 characters';
  END IF;

  INSERT INTO public.groups (name, description, owner_id)
  VALUES (cleaned_name, cleaned_description, auth.uid())
  RETURNING *
  INTO created_group;

  INSERT INTO public.group_members (group_id, user_id, role)
  VALUES (created_group.id, auth.uid(), 'owner')
  ON CONFLICT (group_id, user_id) DO UPDATE SET role = 'owner';

  RETURN created_group;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

GRANT EXECUTE ON FUNCTION public.create_group(TEXT, TEXT) TO authenticated;

NOTIFY pgrst, 'reload schema';

-- ============================================
-- ROLLBACK
-- ============================================

/*
DROP FUNCTION IF EXISTS public.create_group(TEXT, TEXT);
NOTIFY pgrst, 'reload schema';
*/
