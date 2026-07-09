-- Stage 2: Secure Storage Migration for Multi-Couple Hardening
-- DO NOT APPLY THIS UNTIL ALL FILES HAVE BEEN MIGRATED BY scripts/migrate_storage_paths.ts

-- 1. Drop existing bucket-wide read policies
DROP POLICY IF EXISTS "Public can view memory-images" ON storage.objects;
DROP POLICY IF EXISTS "Users can view memory images" ON storage.objects;

DROP POLICY IF EXISTS "Authenticated users can view memory-voices" ON storage.objects;
DROP POLICY IF EXISTS "Users can view memory voices" ON storage.objects;

DROP POLICY IF EXISTS "Authenticated users can view memory-videos" ON storage.objects;
DROP POLICY IF EXISTS "Users can view memory videos" ON storage.objects;

DROP POLICY IF EXISTS "Public can view memory-thumbnails" ON storage.objects;
DROP POLICY IF EXISTS "Users can view memory thumbnails" ON storage.objects;

-- 2. Create secure SELECT policies restricting by relationship_id (first path token)
CREATE POLICY "Users can view memory images securely"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'memory-images' AND 
    public.is_relationship_member((string_to_array(name, '/'))[1]::uuid)
  );

CREATE POLICY "Users can view memory voices securely"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'memory-voices' AND 
    public.is_relationship_member((string_to_array(name, '/'))[1]::uuid)
  );

CREATE POLICY "Users can view memory videos securely"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'memory-videos' AND 
    public.is_relationship_member((string_to_array(name, '/'))[1]::uuid)
  );

CREATE POLICY "Users can view memory thumbnails securely"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'memory-thumbnails' AND 
    public.is_relationship_member((string_to_array(name, '/'))[1]::uuid)
  );
