-- ============================================
-- Migration: Add Supabase Auth profiles, groups, group chat, and group results
-- Author: AI Agent
-- Date: 2026-05-18
-- ============================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================
-- 1. UPDATED_AT HELPER
-- ============================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 2. PROFILES
-- ============================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT profiles_display_name_length CHECK (
    length(trim(display_name)) BETWEEN 2 AND 40
  )
);

COMMENT ON TABLE public.profiles IS 'Public player profiles mirrored from Supabase Auth accounts.';
COMMENT ON COLUMN public.profiles.id IS 'Same id as auth.users.id.';

DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS TRIGGER AS $$
DECLARE
  raw_name TEXT;
BEGIN
  raw_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    split_part(NEW.email, '@', 1),
    'Player'
  );

  INSERT INTO public.profiles (id, email, display_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    left(trim(raw_name), 40),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    display_name = EXCLUDED.display_name,
    avatar_url = EXCLUDED.avatar_url,
    updated_at = now();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

DROP TRIGGER IF EXISTS on_auth_user_created_profile ON auth.users;
CREATE TRIGGER on_auth_user_created_profile
  AFTER INSERT OR UPDATE OF email, raw_user_meta_data ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_profile();

-- ============================================
-- 3. GROUPS AND MEMBERS
-- ============================================

CREATE TABLE IF NOT EXISTS public.groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invite_code TEXT NOT NULL DEFAULT lower(encode(gen_random_bytes(5), 'hex')) UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT groups_name_length CHECK (
    length(trim(name)) BETWEEN 2 AND 60
  ),
  CONSTRAINT groups_description_length CHECK (
    description IS NULL OR length(description) <= 240
  )
);

CREATE TABLE IF NOT EXISTS public.group_members (
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (group_id, user_id),
  CONSTRAINT group_members_role_check CHECK (role IN ('owner', 'admin', 'member'))
);

COMMENT ON TABLE public.groups IS 'Private competition groups for daily puzzle players.';
COMMENT ON TABLE public.group_members IS 'Membership table for group access and rankings.';

CREATE INDEX IF NOT EXISTS idx_group_members_user_id ON public.group_members (user_id);
CREATE INDEX IF NOT EXISTS idx_groups_owner_id ON public.groups (owner_id);

DROP TRIGGER IF EXISTS set_groups_updated_at ON public.groups;
CREATE TRIGGER set_groups_updated_at
  BEFORE UPDATE ON public.groups
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.add_group_owner_membership()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.group_members (group_id, user_id, role)
  VALUES (NEW.id, NEW.owner_id, 'owner')
  ON CONFLICT (group_id, user_id) DO UPDATE SET role = 'owner';

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

DROP TRIGGER IF EXISTS on_group_created_add_owner ON public.groups;
CREATE TRIGGER on_group_created_add_owner
  AFTER INSERT ON public.groups
  FOR EACH ROW
  EXECUTE FUNCTION public.add_group_owner_membership();

CREATE OR REPLACE FUNCTION public.is_group_member(target_group_id UUID, target_user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.group_members gm
    WHERE gm.group_id = target_group_id
      AND gm.user_id = target_user_id
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, auth;

CREATE OR REPLACE FUNCTION public.is_group_admin(target_group_id UUID, target_user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.group_members gm
    WHERE gm.group_id = target_group_id
      AND gm.user_id = target_user_id
      AND gm.role IN ('owner', 'admin')
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, auth;

CREATE OR REPLACE FUNCTION public.join_group_by_invite(target_invite_code TEXT)
RETURNS public.groups AS $$
DECLARE
  matched_group public.groups;
BEGIN
  SELECT *
  INTO matched_group
  FROM public.groups
  WHERE invite_code = lower(trim(target_invite_code));

  IF matched_group.id IS NULL THEN
    RAISE EXCEPTION 'Invalid invite code';
  END IF;

  INSERT INTO public.group_members (group_id, user_id, role)
  VALUES (matched_group.id, auth.uid(), 'member')
  ON CONFLICT (group_id, user_id) DO NOTHING;

  RETURN matched_group;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

-- ============================================
-- 4. GROUP CHAT
-- ============================================

CREATE TABLE IF NOT EXISTS public.group_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  author_name TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT group_messages_author_name_length CHECK (
    length(trim(author_name)) BETWEEN 2 AND 40
  ),
  CONSTRAINT group_messages_body_length CHECK (
    length(trim(body)) BETWEEN 1 AND 800
  )
);

COMMENT ON TABLE public.group_messages IS 'Chat messages visible only to members of the related group.';

CREATE INDEX IF NOT EXISTS idx_group_messages_group_created
  ON public.group_messages (group_id, created_at DESC);

-- ============================================
-- 5. DAILY RESULTS EXTENSION
-- ============================================

ALTER TABLE public.daily_results
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES public.groups(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS operations_count INTEGER,
  ADD COLUMN IF NOT EXISTS word_length INTEGER;

COMMENT ON COLUMN public.daily_results.user_id IS 'Authenticated player that submitted the result.';
COMMENT ON COLUMN public.daily_results.group_id IS 'Optional competition group where the result counts.';
COMMENT ON COLUMN public.daily_results.operations_count IS 'Numbers-game operation count for tie breakers.';
COMMENT ON COLUMN public.daily_results.word_length IS 'Letters-game submitted word length for tie breakers.';

CREATE INDEX IF NOT EXISTS idx_daily_results_group_lookup
  ON public.daily_results (
    group_id,
    challenge_date DESC,
    game_type,
    difficulty,
    score DESC,
    duration_ms ASC,
    operations_count ASC,
    word_length DESC
  );

CREATE INDEX IF NOT EXISTS idx_daily_results_user_lookup
  ON public.daily_results (user_id, challenge_date DESC);

-- Remove public starter policies from migration 001.
DROP POLICY IF EXISTS daily_results_select_public ON public.daily_results;
DROP POLICY IF EXISTS daily_results_insert_public ON public.daily_results;

-- ============================================
-- 6. RLS
-- ============================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_results ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS profiles_select_group_visible ON public.profiles;
CREATE POLICY profiles_select_group_visible ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.group_members viewer
      JOIN public.group_members target
        ON target.group_id = viewer.group_id
      WHERE viewer.user_id = auth.uid()
        AND target.user_id = profiles.id
    )
  );

DROP POLICY IF EXISTS profiles_insert_self ON public.profiles;
CREATE POLICY profiles_insert_self ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS profiles_update_self ON public.profiles;
CREATE POLICY profiles_update_self ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS groups_select_members ON public.groups;
CREATE POLICY groups_select_members ON public.groups
  FOR SELECT
  TO authenticated
  USING (public.is_group_member(id, auth.uid()));

DROP POLICY IF EXISTS groups_insert_owner ON public.groups;
CREATE POLICY groups_insert_owner ON public.groups
  FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS groups_update_admins ON public.groups;
CREATE POLICY groups_update_admins ON public.groups
  FOR UPDATE
  TO authenticated
  USING (public.is_group_admin(id, auth.uid()))
  WITH CHECK (public.is_group_admin(id, auth.uid()));

DROP POLICY IF EXISTS groups_delete_owner ON public.groups;
CREATE POLICY groups_delete_owner ON public.groups
  FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid());

DROP POLICY IF EXISTS group_members_select_group_members ON public.group_members;
CREATE POLICY group_members_select_group_members ON public.group_members
  FOR SELECT
  TO authenticated
  USING (public.is_group_member(group_id, auth.uid()));

DROP POLICY IF EXISTS group_members_insert_admins ON public.group_members;
CREATE POLICY group_members_insert_admins ON public.group_members
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_group_admin(group_id, auth.uid()));

DROP POLICY IF EXISTS group_members_delete_self_or_admin ON public.group_members;
CREATE POLICY group_members_delete_self_or_admin ON public.group_members
  FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_group_admin(group_id, auth.uid())
  );

DROP POLICY IF EXISTS group_messages_select_members ON public.group_messages;
CREATE POLICY group_messages_select_members ON public.group_messages
  FOR SELECT
  TO authenticated
  USING (public.is_group_member(group_id, auth.uid()));

DROP POLICY IF EXISTS group_messages_insert_members ON public.group_messages;
CREATE POLICY group_messages_insert_members ON public.group_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND public.is_group_member(group_id, auth.uid())
  );

DROP POLICY IF EXISTS daily_results_select_group_or_self ON public.daily_results;
CREATE POLICY daily_results_select_group_or_self ON public.daily_results
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR (
      group_id IS NOT NULL
      AND public.is_group_member(group_id, auth.uid())
    )
  );

DROP POLICY IF EXISTS daily_results_insert_group_or_self ON public.daily_results;
CREATE POLICY daily_results_insert_group_or_self ON public.daily_results
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND (
      group_id IS NULL
      OR public.is_group_member(group_id, auth.uid())
    )
  );

-- No UPDATE or DELETE policies are created for daily_results or group_messages.
-- Results and chat messages are immutable in the first version.

-- ============================================
-- ROLLBACK
-- ============================================

/*
DROP POLICY IF EXISTS daily_results_insert_group_or_self ON public.daily_results;
DROP POLICY IF EXISTS daily_results_select_group_or_self ON public.daily_results;
DROP POLICY IF EXISTS group_messages_insert_members ON public.group_messages;
DROP POLICY IF EXISTS group_messages_select_members ON public.group_messages;
DROP POLICY IF EXISTS group_members_delete_self_or_admin ON public.group_members;
DROP POLICY IF EXISTS group_members_insert_admins ON public.group_members;
DROP POLICY IF EXISTS group_members_select_group_members ON public.group_members;
DROP POLICY IF EXISTS groups_delete_owner ON public.groups;
DROP POLICY IF EXISTS groups_update_admins ON public.groups;
DROP POLICY IF EXISTS groups_insert_owner ON public.groups;
DROP POLICY IF EXISTS groups_select_members ON public.groups;
DROP POLICY IF EXISTS profiles_update_self ON public.profiles;
DROP POLICY IF EXISTS profiles_insert_self ON public.profiles;
DROP POLICY IF EXISTS profiles_select_group_visible ON public.profiles;

DROP INDEX IF EXISTS public.idx_daily_results_user_lookup;
DROP INDEX IF EXISTS public.idx_daily_results_group_lookup;
ALTER TABLE public.daily_results
  DROP COLUMN IF EXISTS word_length,
  DROP COLUMN IF EXISTS operations_count,
  DROP COLUMN IF EXISTS group_id,
  DROP COLUMN IF EXISTS user_id;

DROP INDEX IF EXISTS public.idx_group_messages_group_created;
DROP TABLE IF EXISTS public.group_messages;

DROP FUNCTION IF EXISTS public.join_group_by_invite(TEXT);
DROP FUNCTION IF EXISTS public.is_group_admin(UUID, UUID);
DROP FUNCTION IF EXISTS public.is_group_member(UUID, UUID);
DROP TRIGGER IF EXISTS on_group_created_add_owner ON public.groups;
DROP FUNCTION IF EXISTS public.add_group_owner_membership();
DROP TRIGGER IF EXISTS set_groups_updated_at ON public.groups;
DROP INDEX IF EXISTS public.idx_groups_owner_id;
DROP INDEX IF EXISTS public.idx_group_members_user_id;
DROP TABLE IF EXISTS public.group_members;
DROP TABLE IF EXISTS public.groups;

DROP TRIGGER IF EXISTS on_auth_user_created_profile ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user_profile();
DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
DROP TABLE IF EXISTS public.profiles;
DROP FUNCTION IF EXISTS public.set_updated_at();
*/
