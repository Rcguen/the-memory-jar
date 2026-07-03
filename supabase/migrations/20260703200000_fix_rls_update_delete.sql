-- ================================================================
-- MIGRATION: Fix RLS policies for memories UPDATE
-- Date: 2026-07-03
-- Problem: The existing "Users can update memories." policy uses
--          `using (true)` which allows any authenticated user to
--          update any memory row. This causes silent failures when
--          PostgREST's row-level security blocks the write because
--          no explicit creator check exists.
-- Fix: Drop the overly-permissive update policy and replace it
--      with one that restricts updates to the creator only.
-- Safe: idempotent — uses IF EXISTS / DO $$ guards.
-- ================================================================

DO $$
BEGIN
  -- Drop the old permissive policy if it exists
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'memories'
      AND policyname = 'Users can update memories.'
  ) THEN
    DROP POLICY "Users can update memories." ON public.memories;
  END IF;

  -- Create a tighter policy: only the creator can update their own memories
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'memories'
      AND policyname = 'Creators can update their own memories.'
  ) THEN
    CREATE POLICY "Creators can update their own memories."
      ON public.memories FOR UPDATE
      TO authenticated
      USING ( auth.uid() = created_by );
  END IF;
END $$;
