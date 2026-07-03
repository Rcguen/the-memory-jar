-- ================================================================
-- MIGRATION: Timezone Architecture
-- Date: 2026-07-03
-- Safe: idempotent column operations only. No data deleted.
-- ================================================================

-- 1. Add profiles.timezone if it does not exist.
--    Default is NULL (not 'UTC') so we can distinguish
--    "never detected" from "user explicitly chose UTC".
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'profiles'
      AND column_name  = 'timezone'
  ) THEN
    ALTER TABLE public.profiles
      ADD COLUMN timezone text DEFAULT NULL;

    -- Existing rows remain NULL intentionally.
    -- The auto-detection hook will populate them on next login.
  END IF;
END $$;

-- 2. Rename relationship_settings.timezone -> relationship_timezone.
--    Uses IF EXISTS guard so it is safe to run multiple times.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'relationship_settings'
      AND column_name  = 'timezone'
  ) THEN
    ALTER TABLE public.relationship_settings
      RENAME COLUMN timezone TO relationship_timezone;
  END IF;
END $$;

-- 3. Ensure relationship_timezone has a sane default for any
--    existing or future rows that lack a value.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'relationship_settings'
      AND column_name  = 'relationship_timezone'
  ) THEN
    -- Only backfill NULL rows; do not touch explicitly set values.
    UPDATE public.relationship_settings
      SET relationship_timezone = 'UTC'
      WHERE relationship_timezone IS NULL;
  END IF;
END $$;
