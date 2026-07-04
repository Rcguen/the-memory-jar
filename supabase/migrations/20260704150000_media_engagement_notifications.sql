-- ================================================================
-- Media + engagement phase: notification center foundation and
-- thumbnail attachment safety.
-- ================================================================

CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  relationship_id uuid REFERENCES public.relationship_settings(id) ON DELETE CASCADE NOT NULL,
  actor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  type text NOT NULL CHECK (type IN (
    'partner_created_memory',
    'partner_commented',
    'partner_reacted',
    'time_capsule_unlocked'
  )),
  title text NOT NULL,
  body text NOT NULL,
  target_memory_id uuid REFERENCES public.memories(id) ON DELETE SET NULL,
  metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
  read_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_created
  ON public.notifications (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON public.notifications (user_id, read_at)
  WHERE read_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_relationship_created
  ON public.notifications (relationship_id, created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

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
    ELSIF OLD.status = 'sealed' AND NEW.status IN ('opening', 'unlocked') AND NEW.unlock_at IS NOT NULL THEN
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

DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
CREATE POLICY "Users can view their own notifications"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can mark their own notifications read" ON public.notifications;
CREATE POLICY "Users can mark their own notifications read"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "No client notification inserts" ON public.notifications;
CREATE POLICY "No client notification inserts"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (false);

DROP POLICY IF EXISTS "No client notification deletes" ON public.notifications;
CREATE POLICY "No client notification deletes"
  ON public.notifications FOR DELETE
  TO authenticated
  USING (false);

CREATE OR REPLACE FUNCTION public.create_notifications_from_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  notif_type text;
  notif_title text;
  notif_body text;
  memory_title text;
  actor_name text;
BEGIN
  SELECT COALESCE(m.title, 'a memory') INTO memory_title
  FROM public.memories m
  WHERE m.id = NEW.target_memory_id;

  SELECT COALESCE(p.display_name, p.username, 'Your partner') INTO actor_name
  FROM public.profiles p
  WHERE p.id = NEW.actor_id;

  IF NEW.type = 'memory_created' THEN
    notif_type := 'partner_created_memory';
    notif_title := 'New memory in your jar';
    notif_body := actor_name || ' added ' || COALESCE(memory_title, 'a memory') || '.';
  ELSIF NEW.type = 'comment_added' THEN
    notif_type := 'partner_commented';
    notif_title := 'New comment';
    notif_body := actor_name || ' commented on ' || COALESCE(memory_title, 'a memory') || '.';
  ELSIF NEW.type IN ('reaction_added', 'reaction_changed') THEN
    notif_type := 'partner_reacted';
    notif_title := 'New reaction';
    notif_body := actor_name || ' reacted to ' || COALESCE(memory_title, 'a memory') || '.';
  ELSIF NEW.type = 'time_capsule_unlocked' THEN
    notif_type := 'time_capsule_unlocked';
    notif_title := 'A time capsule opened';
    notif_body := COALESCE(memory_title, 'A memory') || ' is ready to open.';
  END IF;

  IF notif_type IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.notifications(
    user_id,
    relationship_id,
    actor_id,
    type,
    title,
    body,
    target_memory_id,
    metadata
  )
  SELECT
    rm.profile_id,
    NEW.relationship_id,
    NEW.actor_id,
    notif_type,
    notif_title,
    notif_body,
    NEW.target_memory_id,
    NEW.metadata
  FROM public.relationship_members rm
  WHERE rm.relationship_id = NEW.relationship_id
    AND rm.profile_id <> NEW.actor_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_activity_notifications ON public.activity_logs;
CREATE TRIGGER trg_activity_notifications
AFTER INSERT ON public.activity_logs
FOR EACH ROW EXECUTE FUNCTION public.create_notifications_from_activity();

CREATE OR REPLACE FUNCTION public.mark_all_notifications_read()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.notifications
  SET read_at = timezone('utc'::text, now())
  WHERE user_id = auth.uid()
    AND read_at IS NULL;
$$;

GRANT EXECUTE ON FUNCTION public.mark_all_notifications_read() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.mark_all_notifications_read() FROM anon, public;
