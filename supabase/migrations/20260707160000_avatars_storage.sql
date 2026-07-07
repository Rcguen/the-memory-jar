-- Create a dedicated avatars bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  false, -- private bucket
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic']::text[]
)
ON CONFLICT (id) DO UPDATE SET 
  public = false,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- RLS Policies for avatars bucket
-- 1. Users can upload their own avatar (only to their folder `avatars/{userId}/...`)
CREATE POLICY "Users can upload their own avatar" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars' 
    AND auth.uid() = owner 
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- 2. Users can update/replace their own avatar
CREATE POLICY "Users can update their own avatar" ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'avatars' 
    AND auth.uid() = owner
  )
  WITH CHECK (
    bucket_id = 'avatars' 
    AND auth.uid() = owner 
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- 3. Users can delete their own avatar
CREATE POLICY "Users can delete their own avatar" ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'avatars' 
    AND auth.uid() = owner
  );

-- 4. Users can read their own avatar (signed URLs will be used for display)
CREATE POLICY "Users can read own avatar" ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'avatars' 
    AND auth.uid() = owner
  );

-- 5. Partners can read the avatar
CREATE POLICY "Partners can read avatar" ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'avatars'
    AND EXISTS (
      SELECT 1 FROM public.relationship_members AS me
      JOIN public.relationship_members AS partner ON me.relationship_id = partner.relationship_id
      WHERE me.profile_id = auth.uid()
      AND partner.profile_id::text = (storage.foldername(name))[1]
    )
  );
