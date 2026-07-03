-- ================================================================
-- MIGRATION: Soft-delete RPC to bypass SELECT RLS on RETURNING
-- 
-- Problem: PostgREST adds RETURNING internally even for minimal
-- updates. PostgreSQL then applies SELECT policy
-- (deleted_at IS NULL) to the returned row, which now has
-- deleted_at = now() → 42501 "new row violates row-level security"
--
-- Fix: A SECURITY DEFINER function runs as the postgres role,
-- bypasses RLS entirely. The creator check is enforced manually
-- inside the function body — equally secure, no RLS loop.
-- ================================================================

CREATE OR REPLACE FUNCTION public.soft_delete_memory(p_memory_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only the creator can delete their own memory
  UPDATE public.memories
  SET deleted_at = NOW()
  WHERE id = p_memory_id
    AND created_by = auth.uid()
    AND deleted_at IS NULL;

  -- If no row was updated, the caller is not the owner (or already deleted)
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Memory not found or permission denied';
  END IF;
END;
$$;

-- Grant execute to authenticated users only
GRANT EXECUTE ON FUNCTION public.soft_delete_memory(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.soft_delete_memory(uuid) FROM anon, public;
