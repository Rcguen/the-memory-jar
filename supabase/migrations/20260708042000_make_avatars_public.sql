-- Make avatars bucket public
UPDATE storage.buckets
SET public = true
WHERE id = 'avatars';

-- We can safely drop the SELECT policies since the bucket is now public and anyone can read it without RLS
DROP POLICY IF EXISTS "Users can read own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Partners can read avatar" ON storage.objects;

-- We still keep INSERT, UPDATE, DELETE policies so users can only manage their own avatars.
