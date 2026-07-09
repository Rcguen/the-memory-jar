-- Stage 1: Database Schema & Backfill for Multi-Couple Hardening

-- 1. Profiles: Add active_relationship_id
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS active_relationship_id uuid REFERENCES public.relationship_settings(id) ON DELETE SET NULL;

-- Backfill active_relationship_id with the first available relationship
UPDATE public.profiles p
SET active_relationship_id = (
  SELECT relationship_id
  FROM public.relationship_members rm
  WHERE rm.profile_id = p.id
  LIMIT 1
)
WHERE active_relationship_id IS NULL;

-- 2. Child Tables: Add relationship_id
ALTER TABLE public.memory_attachments
ADD COLUMN IF NOT EXISTS relationship_id uuid REFERENCES public.relationship_settings(id) ON DELETE CASCADE;

ALTER TABLE public.memory_comments
ADD COLUMN IF NOT EXISTS relationship_id uuid REFERENCES public.relationship_settings(id) ON DELETE CASCADE;

ALTER TABLE public.memory_reactions
ADD COLUMN IF NOT EXISTS relationship_id uuid REFERENCES public.relationship_settings(id) ON DELETE CASCADE;

ALTER TABLE public.memory_favorites
ADD COLUMN IF NOT EXISTS relationship_id uuid REFERENCES public.relationship_settings(id) ON DELETE CASCADE;

-- Backfill relationship_id from memories
UPDATE public.memory_attachments t
SET relationship_id = m.relationship_id
FROM public.memories m
WHERE t.memory_id = m.id AND t.relationship_id IS NULL;

UPDATE public.memory_comments t
SET relationship_id = m.relationship_id
FROM public.memories m
WHERE t.memory_id = m.id AND t.relationship_id IS NULL;

UPDATE public.memory_reactions t
SET relationship_id = m.relationship_id
FROM public.memories m
WHERE t.memory_id = m.id AND t.relationship_id IS NULL;

UPDATE public.memory_favorites t
SET relationship_id = m.relationship_id
FROM public.memories m
WHERE t.memory_id = m.id AND t.relationship_id IS NULL;

-- 3. Verify and Set NOT NULL Constraints
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.memory_attachments WHERE relationship_id IS NULL) THEN
    ALTER TABLE public.memory_attachments ALTER COLUMN relationship_id SET NOT NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.memory_comments WHERE relationship_id IS NULL) THEN
    ALTER TABLE public.memory_comments ALTER COLUMN relationship_id SET NOT NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.memory_reactions WHERE relationship_id IS NULL) THEN
    ALTER TABLE public.memory_reactions ALTER COLUMN relationship_id SET NOT NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.memory_favorites WHERE relationship_id IS NULL) THEN
    ALTER TABLE public.memory_favorites ALTER COLUMN relationship_id SET NOT NULL;
  END IF;
END $$;

-- 4. Add Indexes
CREATE INDEX IF NOT EXISTS idx_memory_attachments_relationship_id ON public.memory_attachments(relationship_id);
CREATE INDEX IF NOT EXISTS idx_memory_comments_relationship_id ON public.memory_comments(relationship_id);
CREATE INDEX IF NOT EXISTS idx_memory_reactions_relationship_id ON public.memory_reactions(relationship_id);
CREATE INDEX IF NOT EXISTS idx_memory_favorites_relationship_id ON public.memory_favorites(relationship_id);

-- 5. Create RPC for safe memory pinning
CREATE OR REPLACE FUNCTION public.toggle_memory_pin(p_memory_id uuid, p_is_pinned boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_relationship_id uuid;
BEGIN
  -- Verify the memory exists and get its relationship
  SELECT relationship_id INTO v_relationship_id
  FROM public.memories
  WHERE id = p_memory_id AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Memory not found or deleted';
  END IF;

  -- Ensure the user is a member of this relationship
  IF NOT public.is_relationship_member(v_relationship_id) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  -- Update the pin state
  UPDATE public.memories
  SET 
    is_pinned = p_is_pinned,
    pinned_at = CASE WHEN p_is_pinned THEN NOW() ELSE NULL END,
    updated_at = NOW()
  WHERE id = p_memory_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.toggle_memory_pin(uuid, boolean) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.toggle_memory_pin(uuid, boolean) FROM anon, public;
