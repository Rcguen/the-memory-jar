-- 20260702144800_production_hardening_rls.sql

-- ==========================================
-- 1. DROP INSECURE POLICIES
-- ==========================================

-- memories
DROP POLICY IF EXISTS "Users can view all memories." ON public.memories;
DROP POLICY IF EXISTS "Users can insert memories." ON public.memories;
DROP POLICY IF EXISTS "Users can update memories." ON public.memories;

-- memory_visual_state
DROP POLICY IF EXISTS "Users can view their own memory visual states" ON public.memory_visual_state;
DROP POLICY IF EXISTS "Users can manage their own memory visual states" ON public.memory_visual_state;

-- memory_attachments
DROP POLICY IF EXISTS "Users can view all attachments." ON public.memory_attachments;
DROP POLICY IF EXISTS "Users can insert attachments." ON public.memory_attachments;

-- storage
DROP POLICY IF EXISTS "Authenticated users can upload to memory-images" ON storage.objects;
DROP POLICY IF EXISTS "Public can view memory-images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload to memory-voices" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view memory-voices" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload to memory-videos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view memory-videos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload to memory-thumbnails" ON storage.objects;
DROP POLICY IF EXISTS "Public can view memory-thumbnails" ON storage.objects;


-- ==========================================
-- 2. CREATE HELPER FUNCTIONS
-- ==========================================

-- Check if user is part of a relationship
CREATE OR REPLACE FUNCTION public.is_relationship_member(target_relationship_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.relationship_members
    WHERE relationship_id = target_relationship_id
      AND profile_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ==========================================
-- 3. REWRITE MEMORIES POLICIES
-- ==========================================

-- Read: Users belonging to the relationship can read
CREATE POLICY "Users can view memories in their relationship"
  ON public.memories FOR SELECT
  TO authenticated
  USING ( public.is_relationship_member(relationship_id) AND deleted_at IS NULL );

-- Insert: Users can only create their own memories in their relationships
CREATE POLICY "Users can insert memories into their relationships"
  ON public.memories FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = created_by AND 
    public.is_relationship_member(relationship_id)
  );

-- Update: Only creator may update
CREATE POLICY "Users can update their own memories"
  ON public.memories FOR UPDATE
  TO authenticated
  USING ( auth.uid() = created_by );

-- Delete: Only creator may delete (even though we do soft delete, good to have)
CREATE POLICY "Users can delete their own memories"
  ON public.memories FOR DELETE
  TO authenticated
  USING ( auth.uid() = created_by );


-- ==========================================
-- 4. REWRITE MEMORY VISUAL STATE POLICIES
-- ==========================================

-- Read/Write: Only if the visual state belongs to a memory inside one of their relationships
CREATE POLICY "Users can select visual states of their relationships"
  ON public.memory_visual_state FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.memories m
      WHERE m.id = memory_id
      AND public.is_relationship_member(m.relationship_id)
    )
  );

CREATE POLICY "Users can insert visual states of their relationships"
  ON public.memory_visual_state FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.memories m
      WHERE m.id = memory_id
      AND public.is_relationship_member(m.relationship_id)
    )
  );

CREATE POLICY "Users can update visual states of their relationships"
  ON public.memory_visual_state FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.memories m
      WHERE m.id = memory_id
      AND public.is_relationship_member(m.relationship_id)
    )
  );


-- ==========================================
-- 5. REWRITE MEMORY ATTACHMENTS POLICIES
-- ==========================================

CREATE POLICY "Users can view attachments of their relationships"
  ON public.memory_attachments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.memories m
      WHERE m.id = memory_id
      AND public.is_relationship_member(m.relationship_id)
    )
  );

CREATE POLICY "Users can insert attachments to their own memories"
  ON public.memory_attachments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.memories m
      WHERE m.id = memory_id
      AND m.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can update attachments of their own memories"
  ON public.memory_attachments FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.memories m
      WHERE m.id = memory_id
      AND m.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can delete attachments of their own memories"
  ON public.memory_attachments FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.memories m
      WHERE m.id = memory_id
      AND m.created_by = auth.uid()
    )
  );


-- ==========================================
-- 6. RELATIONSHIP SETTINGS & MEMBERS
-- ==========================================

-- Drop existing
DROP POLICY IF EXISTS "Authenticated users can read relationship_settings." ON public.relationship_settings;
DROP POLICY IF EXISTS "Authenticated users can read relationship_members." ON public.relationship_members;

CREATE POLICY "Users can read their own relationship settings"
  ON public.relationship_settings FOR SELECT
  TO authenticated
  USING ( public.is_relationship_member(id) );

CREATE POLICY "Users can read their own relationship members"
  ON public.relationship_members FOR SELECT
  TO authenticated
  USING ( profile_id = auth.uid() OR public.is_relationship_member(relationship_id) );


-- ==========================================
-- 7. PROFILES
-- ==========================================

-- Existing "Users can view their own profile." & "Users can update their own profile." are fine for strictly own-profile access.
-- But members of a relationship need to view their partner's profile.
DROP POLICY IF EXISTS "Users can view partner profiles" ON public.profiles;
CREATE POLICY "Users can view partner profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.relationship_members rm1
      JOIN public.relationship_members rm2 ON rm1.relationship_id = rm2.relationship_id
      WHERE rm1.profile_id = public.profiles.id
  AND rm2.profile_id = auth.uid()
    )
  );


-- ==========================================
-- 8. STORAGE BUCKETS SECURITY
-- ==========================================

-- memory-images
CREATE POLICY "Users can view memory images"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'memory-images'); -- Strict relational check on storage paths is hard without RPCs, usually rely on URL obscurity or path parsing. Since this is an audit we limit to authenticated.

CREATE POLICY "Users can upload memory images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'memory-images' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can update memory images"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'memory-images' AND owner = auth.uid());

CREATE POLICY "Users can delete memory images"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'memory-images' AND owner = auth.uid());

-- memory-voices
CREATE POLICY "Users can view memory voices"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'memory-voices');

CREATE POLICY "Users can upload memory voices"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'memory-voices' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can update memory voices"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'memory-voices' AND owner = auth.uid());

CREATE POLICY "Users can delete memory voices"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'memory-voices' AND owner = auth.uid());

-- memory-videos
CREATE POLICY "Users can view memory videos"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'memory-videos');

CREATE POLICY "Users can upload memory videos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'memory-videos' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can update memory videos"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'memory-videos' AND owner = auth.uid());

CREATE POLICY "Users can delete memory videos"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'memory-videos' AND owner = auth.uid());

-- memory-thumbnails
CREATE POLICY "Users can view memory thumbnails"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'memory-thumbnails');

CREATE POLICY "Users can upload memory thumbnails"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'memory-thumbnails' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can update memory thumbnails"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'memory-thumbnails' AND owner = auth.uid());

CREATE POLICY "Users can delete memory thumbnails"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'memory-thumbnails' AND owner = auth.uid());

-- Note: `owner = auth.uid()` relies on Supabase Storage setting the `owner` to the uploader's UUID automatically.
