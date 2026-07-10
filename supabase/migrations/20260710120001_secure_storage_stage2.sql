-- Stage 2: Secure Storage Migration for Multi-Couple Hardening
-- DO NOT APPLY THIS UNTIL ALL FILES HAVE BEEN MIGRATED BY scripts/migrate_storage_paths.ts
-- Old root-level files will NOT be accessible after this migration. They should remain in the bucket for backup until verified, but they will be isolated from users.

-- 1. SAFE PATH VALIDATION HELPER
CREATE OR REPLACE FUNCTION public.safe_storage_relationship_id(object_name text)
RETURNS uuid
LANGUAGE sql
IMMUTABLE
SECURITY INVOKER
AS $$
  SELECT CASE
    WHEN (string_to_array(object_name, '/'))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    THEN (string_to_array(object_name, '/'))[1]::uuid
    ELSE NULL
  END;
$$;

CREATE OR REPLACE FUNCTION public.safe_storage_memory_id(object_name text)
RETURNS uuid
LANGUAGE sql
IMMUTABLE
SECURITY INVOKER
AS $$
  SELECT CASE
    WHEN (string_to_array(object_name, '/'))[2] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    THEN (string_to_array(object_name, '/'))[2]::uuid
    ELSE NULL
  END;
$$;

-- 2. BUCKET PRIVACY
-- Make sure the memory buckets are strictly private
UPDATE storage.buckets
SET public = false
WHERE id IN ('memory-images', 'memory-videos', 'memory-voices', 'memory-thumbnails');

-- 3. DROP OLD BROAD POLICIES
-- SELECT
DROP POLICY IF EXISTS "Public can view memory-images" ON storage.objects;
DROP POLICY IF EXISTS "Users can view memory images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view memory-voices" ON storage.objects;
DROP POLICY IF EXISTS "Users can view memory voices" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view memory-videos" ON storage.objects;
DROP POLICY IF EXISTS "Users can view memory videos" ON storage.objects;
DROP POLICY IF EXISTS "Public can view memory-thumbnails" ON storage.objects;
DROP POLICY IF EXISTS "Users can view memory thumbnails" ON storage.objects;

-- INSERT
DROP POLICY IF EXISTS "Users can upload memory images" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload memory voices" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload memory videos" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload memory thumbnails" ON storage.objects;

-- UPDATE
DROP POLICY IF EXISTS "Users can update memory images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update memory voices" ON storage.objects;
DROP POLICY IF EXISTS "Users can update memory videos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update memory thumbnails" ON storage.objects;

-- DELETE
DROP POLICY IF EXISTS "Users can delete memory images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete memory voices" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete memory videos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete memory thumbnails" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete memory-images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete memory-voices" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete memory-videos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete memory-thumbnails" ON storage.objects;

-- Drop incorrectly created Stage 2 policies if re-running
DROP POLICY IF EXISTS "Users can view memory images securely" ON storage.objects;
DROP POLICY IF EXISTS "Users can view memory voices securely" ON storage.objects;
DROP POLICY IF EXISTS "Users can view memory videos securely" ON storage.objects;
DROP POLICY IF EXISTS "Users can view memory thumbnails securely" ON storage.objects;
DROP POLICY IF EXISTS "Users can view memory media securely" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload memory media securely" ON storage.objects;
DROP POLICY IF EXISTS "Users can update memory media securely" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete memory media securely" ON storage.objects;

-- 4. STRICT SELECT POLICY
CREATE POLICY "Users can view memory media securely"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id IN ('memory-images', 'memory-videos', 'memory-voices', 'memory-thumbnails') AND
    public.is_relationship_member(public.safe_storage_relationship_id(name))
  );

-- 5. STRICT INSERT POLICY
CREATE POLICY "Users can upload memory media securely"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id IN ('memory-images', 'memory-videos', 'memory-voices', 'memory-thumbnails') AND
    public.is_relationship_member(public.safe_storage_relationship_id(name)) AND
    EXISTS (
      SELECT 1 FROM public.memories m
      WHERE m.id = public.safe_storage_memory_id(name)
      AND m.relationship_id = public.safe_storage_relationship_id(name)
      AND m.created_by = auth.uid()
    )
  );

-- 6. STRICT UPDATE POLICY
CREATE POLICY "Users can update memory media securely"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id IN ('memory-images', 'memory-videos', 'memory-voices', 'memory-thumbnails') AND
    public.is_relationship_member(public.safe_storage_relationship_id(name)) AND
    EXISTS (
      SELECT 1 FROM public.memories m
      WHERE m.id = public.safe_storage_memory_id(name)
      AND m.relationship_id = public.safe_storage_relationship_id(name)
      AND m.created_by = auth.uid()
    )
  )
  WITH CHECK (
    bucket_id IN ('memory-images', 'memory-videos', 'memory-voices', 'memory-thumbnails') AND
    public.is_relationship_member(public.safe_storage_relationship_id(name)) AND
    EXISTS (
      SELECT 1 FROM public.memories m
      WHERE m.id = public.safe_storage_memory_id(name)
      AND m.relationship_id = public.safe_storage_relationship_id(name)
      AND m.created_by = auth.uid()
    )
  );

-- 7. STRICT DELETE POLICY
CREATE POLICY "Users can delete memory media securely"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id IN ('memory-images', 'memory-videos', 'memory-voices', 'memory-thumbnails') AND
    public.is_relationship_member(public.safe_storage_relationship_id(name)) AND
    EXISTS (
      SELECT 1 FROM public.memories m
      WHERE m.id = public.safe_storage_memory_id(name)
      AND m.relationship_id = public.safe_storage_relationship_id(name)
      AND m.created_by = auth.uid()
    )
  );
