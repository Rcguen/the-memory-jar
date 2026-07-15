-- Notification correctness: memory-created notifications move to the
-- authenticated post-upload API so failed required uploads cannot notify.
BEGIN;

-- Do not silently rewrite production history. Abort with a sanitized count if
-- existing duplicates would prevent the partial uniqueness guarantee.
DO $$
DECLARE
  duplicate_groups bigint;
BEGIN
  SELECT count(*)
  INTO duplicate_groups
  FROM (
    SELECT user_id, type, target_memory_id
    FROM public.notifications
    WHERE type = 'partner_created_memory'
      AND target_memory_id IS NOT NULL
    GROUP BY user_id, type, target_memory_id
    HAVING count(*) > 1
  ) duplicates;

  IF duplicate_groups > 0 THEN
    RAISE EXCEPTION
      'notification correctness migration blocked: % duplicate partner-created notification groups exist',
      duplicate_groups;
  END IF;
END;
$$;

-- Partial uniqueness applies only to the new-memory event. Other notification
-- types for the same memory remain independent.
CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_unique_partner_created_memory
  ON public.notifications (user_id, type, target_memory_id)
  WHERE type = 'partner_created_memory'
    AND target_memory_id IS NOT NULL;

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
  notif_metadata jsonb := NEW.metadata;
  memory_title text;
  actor_name text;
BEGIN
  SELECT COALESCE(m.title, 'a memory') INTO memory_title
  FROM public.memories m
  WHERE m.id = NEW.target_memory_id;

  SELECT COALESCE(p.display_name, p.username, 'Your partner') INTO actor_name
  FROM public.profiles p
  WHERE p.id = NEW.actor_id;

  -- memory_created remains in activity_logs, but its notification is now
  -- created by the authenticated API only after required uploads succeed.
  IF NEW.type = 'comment_added' THEN
    notif_type := 'partner_commented';
    notif_title := 'New comment';
    notif_body := actor_name || ' commented on ' || COALESCE(memory_title, 'a memory') || '.';
  ELSIF NEW.type IN ('reaction_added', 'reaction_changed') THEN
    notif_type := 'partner_reacted';
    notif_title := 'New reaction';
    notif_body := actor_name || ' reacted to ' || COALESCE(memory_title, 'a memory') || '.';
  ELSIF NEW.type = 'time_capsule_unlocked' THEN
    notif_type := 'time_capsule_unlocked';
    notif_title := 'The Memory Jar';
    notif_body := 'A little memory has been waiting for you';
    -- Unlock notifications must never copy the activity title or capsule type.
    notif_metadata := jsonb_build_object('notification_category', 'capsule_unlocked');
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
    notif_metadata
  FROM public.relationship_members rm
  WHERE rm.relationship_id = NEW.relationship_id
    AND rm.profile_id <> NEW.actor_id;

  RETURN NEW;
END;
$$;

-- The existing trg_activity_notifications trigger remains enabled and keeps
-- handling comments, reactions and the existing unlock event.
COMMIT;
