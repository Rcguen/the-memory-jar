-- ================================================================
-- Production UX phase: trash, favorites, pins, reactions, comments,
-- and activity feed.
-- ================================================================

ALTER TABLE public.memories
  ADD COLUMN IF NOT EXISTS is_pinned boolean DEFAULT false NOT NULL,
  ADD COLUMN IF NOT EXISTS pinned_at timestamp with time zone;

CREATE INDEX IF NOT EXISTS idx_memories_relationship_deleted_pinned_created
  ON public.memories (relationship_id, deleted_at, is_pinned DESC, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_memories_search_title
  ON public.memories USING gin (to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(content, '')));

CREATE POLICY "Creators can view their own trashed memories"
  ON public.memories FOR SELECT
  TO authenticated
  USING (deleted_at IS NOT NULL AND created_by = auth.uid());

CREATE TABLE IF NOT EXISTS public.memory_favorites (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  memory_id uuid REFERENCES public.memories(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(memory_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.memory_reactions (
  memory_id uuid REFERENCES public.memories(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  emoji text NOT NULL CHECK (emoji IN ('❤️', '🥹', '😂', '😭', '😍', '🔥')),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY(memory_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.memory_comments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  memory_id uuid REFERENCES public.memories(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL CHECK (char_length(trim(content)) BETWEEN 1 AND 1200),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.activity_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  relationship_id uuid REFERENCES public.relationship_settings(id) ON DELETE CASCADE NOT NULL,
  actor_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL CHECK (type IN (
    'memory_created',
    'memory_edited',
    'memory_deleted',
    'memory_restored',
    'favorite_added',
    'favorite_removed',
    'reaction_added',
    'reaction_changed',
    'comment_added',
    'comment_edited',
    'comment_deleted',
    'time_capsule_locked',
    'time_capsule_unlocked'
  )),
  target_memory_id uuid REFERENCES public.memories(id) ON DELETE SET NULL,
  metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_memory_favorites_memory ON public.memory_favorites(memory_id);
CREATE INDEX IF NOT EXISTS idx_memory_favorites_user ON public.memory_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_memory_reactions_memory ON public.memory_reactions(memory_id);
CREATE INDEX IF NOT EXISTS idx_memory_comments_memory_created ON public.memory_comments(memory_id, created_at);
CREATE INDEX IF NOT EXISTS idx_activity_logs_relationship_created ON public.activity_logs(relationship_id, created_at DESC);

ALTER TABLE public.memory_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memory_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memory_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Relationship members can view favorites"
  ON public.memory_favorites FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.memories m
      WHERE m.id = memory_id AND public.is_relationship_member(m.relationship_id)
    )
  );

CREATE POLICY "Users can manage their own favorites"
  ON public.memory_favorites FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.memories m
      WHERE m.id = memory_id AND public.is_relationship_member(m.relationship_id)
    )
  );

CREATE POLICY "Relationship members can view reactions"
  ON public.memory_reactions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.memories m
      WHERE m.id = memory_id AND public.is_relationship_member(m.relationship_id)
    )
  );

CREATE POLICY "Users can manage their own reactions"
  ON public.memory_reactions FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.memories m
      WHERE m.id = memory_id AND public.is_relationship_member(m.relationship_id)
    )
  );

CREATE POLICY "Relationship members can view comments"
  ON public.memory_comments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.memories m
      WHERE m.id = memory_id AND public.is_relationship_member(m.relationship_id)
    )
  );

CREATE POLICY "Users can add comments"
  ON public.memory_comments FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.memories m
      WHERE m.id = memory_id AND public.is_relationship_member(m.relationship_id)
    )
  );

CREATE POLICY "Authors can edit comments"
  ON public.memory_comments FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Authors can delete comments"
  ON public.memory_comments FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Relationship members can view activity"
  ON public.activity_logs FOR SELECT
  TO authenticated
  USING (public.is_relationship_member(relationship_id));

CREATE POLICY "Authenticated users can delete memory-images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'memory-images');

CREATE POLICY "Authenticated users can delete memory-voices"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'memory-voices');

CREATE POLICY "Authenticated users can delete memory-videos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'memory-videos');

CREATE POLICY "Authenticated users can delete memory-thumbnails"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'memory-thumbnails');

CREATE POLICY "Members can insert activity"
  ON public.activity_logs FOR INSERT
  TO authenticated
  WITH CHECK (actor_id = auth.uid() AND public.is_relationship_member(relationship_id));

CREATE OR REPLACE FUNCTION public.set_comment_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_memory_comments_updated_at ON public.memory_comments;
CREATE TRIGGER trg_memory_comments_updated_at
BEFORE UPDATE ON public.memory_comments
FOR EACH ROW EXECUTE FUNCTION public.set_comment_updated_at();

CREATE OR REPLACE FUNCTION public.log_memory_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  activity_type text;
  actor uuid;
BEGIN
  IF TG_OP = 'INSERT' THEN
    activity_type := 'memory_created';
    actor := NEW.created_by;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
      activity_type := 'memory_deleted';
    ELSIF OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS NULL THEN
      activity_type := 'memory_restored';
    ELSIF OLD.unlock_at IS NULL AND NEW.unlock_at IS NOT NULL THEN
      activity_type := 'time_capsule_locked';
    ELSIF OLD.status = 'sealed' AND NEW.status = 'unlocked' AND NEW.unlock_at IS NOT NULL THEN
      activity_type := 'time_capsule_unlocked';
    ELSE
      activity_type := 'memory_edited';
    END IF;
    actor := auth.uid();
    IF actor IS NULL THEN actor := NEW.created_by; END IF;
  END IF;

  IF activity_type IS NOT NULL THEN
    INSERT INTO public.activity_logs(relationship_id, actor_id, type, target_memory_id, metadata)
    VALUES (NEW.relationship_id, actor, activity_type, NEW.id, jsonb_build_object('title', NEW.title, 'type', NEW.type));
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_memories_activity ON public.memories;
CREATE TRIGGER trg_memories_activity
AFTER INSERT OR UPDATE ON public.memories
FOR EACH ROW EXECUTE FUNCTION public.log_memory_activity();

CREATE OR REPLACE FUNCTION public.log_favorite_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rel uuid;
  memory_title text;
BEGIN
  SELECT relationship_id, title INTO rel, memory_title FROM public.memories WHERE id = COALESCE(NEW.memory_id, OLD.memory_id);
  INSERT INTO public.activity_logs(relationship_id, actor_id, type, target_memory_id, metadata)
  VALUES (
    rel,
    COALESCE(NEW.user_id, OLD.user_id),
    CASE WHEN TG_OP = 'INSERT' THEN 'favorite_added' ELSE 'favorite_removed' END,
    COALESCE(NEW.memory_id, OLD.memory_id),
    jsonb_build_object('title', memory_title)
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_memory_favorites_activity_insert ON public.memory_favorites;
CREATE TRIGGER trg_memory_favorites_activity_insert
AFTER INSERT ON public.memory_favorites
FOR EACH ROW EXECUTE FUNCTION public.log_favorite_activity();

DROP TRIGGER IF EXISTS trg_memory_favorites_activity_delete ON public.memory_favorites;
CREATE TRIGGER trg_memory_favorites_activity_delete
AFTER DELETE ON public.memory_favorites
FOR EACH ROW EXECUTE FUNCTION public.log_favorite_activity();

CREATE OR REPLACE FUNCTION public.log_reaction_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rel uuid;
BEGIN
  SELECT relationship_id INTO rel FROM public.memories WHERE id = NEW.memory_id;
  INSERT INTO public.activity_logs(relationship_id, actor_id, type, target_memory_id, metadata)
  VALUES (
    rel,
    NEW.user_id,
    CASE WHEN TG_OP = 'INSERT' THEN 'reaction_added' ELSE 'reaction_changed' END,
    NEW.memory_id,
    jsonb_build_object('emoji', NEW.emoji)
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_memory_reactions_activity_insert ON public.memory_reactions;
CREATE TRIGGER trg_memory_reactions_activity_insert
AFTER INSERT ON public.memory_reactions
FOR EACH ROW EXECUTE FUNCTION public.log_reaction_activity();

DROP TRIGGER IF EXISTS trg_memory_reactions_activity_update ON public.memory_reactions;
CREATE TRIGGER trg_memory_reactions_activity_update
AFTER UPDATE ON public.memory_reactions
FOR EACH ROW EXECUTE FUNCTION public.log_reaction_activity();

CREATE OR REPLACE FUNCTION public.log_comment_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rel uuid;
BEGIN
  SELECT relationship_id INTO rel FROM public.memories WHERE id = COALESCE(NEW.memory_id, OLD.memory_id);
  INSERT INTO public.activity_logs(relationship_id, actor_id, type, target_memory_id, metadata)
  VALUES (
    rel,
    COALESCE(NEW.user_id, OLD.user_id),
    CASE TG_OP
      WHEN 'INSERT' THEN 'comment_added'
      WHEN 'UPDATE' THEN 'comment_edited'
      ELSE 'comment_deleted'
    END,
    COALESCE(NEW.memory_id, OLD.memory_id),
    jsonb_build_object('comment_id', COALESCE(NEW.id, OLD.id))
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_memory_comments_activity_insert ON public.memory_comments;
CREATE TRIGGER trg_memory_comments_activity_insert
AFTER INSERT ON public.memory_comments
FOR EACH ROW EXECUTE FUNCTION public.log_comment_activity();

DROP TRIGGER IF EXISTS trg_memory_comments_activity_update ON public.memory_comments;
CREATE TRIGGER trg_memory_comments_activity_update
AFTER UPDATE ON public.memory_comments
FOR EACH ROW EXECUTE FUNCTION public.log_comment_activity();

DROP TRIGGER IF EXISTS trg_memory_comments_activity_delete ON public.memory_comments;
CREATE TRIGGER trg_memory_comments_activity_delete
AFTER DELETE ON public.memory_comments
FOR EACH ROW EXECUTE FUNCTION public.log_comment_activity();

CREATE OR REPLACE FUNCTION public.restore_memory(p_memory_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.memories
  SET deleted_at = NULL, updated_at = NOW()
  WHERE id = p_memory_id
    AND created_by = auth.uid()
    AND deleted_at IS NOT NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Memory not found or permission denied';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.permanently_delete_memory(p_memory_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.memories
  WHERE id = p_memory_id
    AND created_by = auth.uid()
    AND deleted_at IS NOT NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Memory not found or permission denied';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.restore_memory(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.permanently_delete_memory(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.restore_memory(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.permanently_delete_memory(uuid) FROM anon, public;
