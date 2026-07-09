-- 1. Add invite_code
ALTER TABLE public.relationship_settings
ADD COLUMN IF NOT EXISTS invite_code text;

-- 2. Backfill existing with unique short codes (JAR-XXXX)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

UPDATE public.relationship_settings
SET invite_code = 'JAR-' || upper(substr(md5(random()::text || id::text), 1, 6))
WHERE invite_code IS NULL;

-- 3. Make invite_code UNIQUE and NOT NULL
DO $$
BEGIN
  ALTER TABLE public.relationship_settings ALTER COLUMN invite_code SET NOT NULL;
EXCEPTION WHEN others THEN
  -- ignore if already set
END $$;

DO $$
BEGIN
  ALTER TABLE public.relationship_settings
  ADD CONSTRAINT relationship_settings_invite_code_key UNIQUE (invite_code);
EXCEPTION WHEN duplicate_table THEN
  -- duplicate_table actually catches existing constraint violations of same name sometimes, or duplicate_object
  NULL;
WHEN duplicate_object THEN
  NULL;
END $$;

-- 4. RPC: create_relationship
CREATE OR REPLACE FUNCTION public.create_relationship(
  p_start_date timestamp with time zone,
  p_timezone text,
  p_anniversary_type text,
  p_partner_name text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_active_id uuid;
  v_new_relationship_id uuid;
  v_invite_code text;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Verify user does not already have an active relationship
  SELECT active_relationship_id INTO v_active_id FROM public.profiles WHERE id = v_user_id;
  IF v_active_id IS NOT NULL THEN
    RAISE EXCEPTION 'User already has an active relationship';
  END IF;

  -- Generate unique invite code
  LOOP
    v_invite_code := 'JAR-' || upper(substr(md5(random()::text), 1, 6));
    BEGIN
      INSERT INTO public.relationship_settings (start_date, relationship_timezone, anniversary_type, invite_code)
      VALUES (p_start_date, p_timezone, p_anniversary_type, v_invite_code)
      RETURNING id INTO v_new_relationship_id;
      EXIT; -- Success, break out of loop
    EXCEPTION WHEN unique_violation THEN
      -- Loop again if code collision
    END;
  END LOOP;

  -- Insert current user as member
  INSERT INTO public.relationship_members (relationship_id, profile_id, role)
  VALUES (v_new_relationship_id, v_user_id, 'partner');

  -- Update active_relationship_id
  UPDATE public.profiles
  SET active_relationship_id = v_new_relationship_id
  WHERE id = v_user_id;

  RETURN v_new_relationship_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.create_relationship TO authenticated;


-- 5. RPC: join_relationship
CREATE OR REPLACE FUNCTION public.join_relationship(p_invite_code text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_active_id uuid;
  v_target_relationship_id uuid;
  v_member_count int;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Verify user does not already have an active relationship
  SELECT active_relationship_id INTO v_active_id FROM public.profiles WHERE id = v_user_id;
  IF v_active_id IS NOT NULL THEN
    RAISE EXCEPTION 'User already has an active relationship';
  END IF;

  -- Find relationship by invite code
  SELECT id INTO v_target_relationship_id
  FROM public.relationship_settings
  WHERE invite_code = p_invite_code;

  IF v_target_relationship_id IS NULL THEN
    RAISE EXCEPTION 'Invalid invite code';
  END IF;

  -- Verify member count < 2
  SELECT count(*) INTO v_member_count
  FROM public.relationship_members
  WHERE relationship_id = v_target_relationship_id;

  IF v_member_count >= 2 THEN
    RAISE EXCEPTION 'Relationship is already full';
  END IF;

  -- Insert user
  INSERT INTO public.relationship_members (relationship_id, profile_id, role)
  VALUES (v_target_relationship_id, v_user_id, 'partner')
  ON CONFLICT (relationship_id, profile_id) DO NOTHING;

  -- Update active_relationship_id
  UPDATE public.profiles
  SET active_relationship_id = v_target_relationship_id
  WHERE id = v_user_id;

  RETURN v_target_relationship_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.join_relationship TO authenticated;


-- 6. RPC: update_relationship_settings
CREATE OR REPLACE FUNCTION public.update_relationship_settings(
  p_relationship_id uuid,
  p_start_date timestamp with time zone,
  p_timezone text,
  p_anniversary_type text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify user is member
  IF NOT public.is_relationship_member(p_relationship_id) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  UPDATE public.relationship_settings
  SET 
    start_date = p_start_date,
    relationship_timezone = p_timezone,
    anniversary_type = p_anniversary_type,
    updated_at = now()
  WHERE id = p_relationship_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.update_relationship_settings TO authenticated;


-- 7. RPC: regenerate_invite_code
CREATE OR REPLACE FUNCTION public.regenerate_invite_code(p_relationship_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member_count int;
  v_new_code text;
BEGIN
  -- Verify user is member
  IF NOT public.is_relationship_member(p_relationship_id) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  -- Verify only 1 member
  SELECT count(*) INTO v_member_count
  FROM public.relationship_members
  WHERE relationship_id = p_relationship_id;

  IF v_member_count > 1 THEN
    RAISE EXCEPTION 'Cannot regenerate invite code when relationship is full';
  END IF;

  LOOP
    v_new_code := 'JAR-' || upper(substr(md5(random()::text), 1, 6));
    BEGIN
      UPDATE public.relationship_settings
      SET invite_code = v_new_code
      WHERE id = p_relationship_id;
      EXIT;
    EXCEPTION WHEN unique_violation THEN
      -- loop
    END;
  END LOOP;

  RETURN v_new_code;
END;
$$;
GRANT EXECUTE ON FUNCTION public.regenerate_invite_code TO authenticated;
