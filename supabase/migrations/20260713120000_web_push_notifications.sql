-- ================================================================
-- Phase 1 secure web push notifications.
-- Stores browser push subscriptions scoped to the authenticated user
-- and a minimal event delivery log for server-side idempotency.
-- ================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  relationship_id uuid NOT NULL REFERENCES public.relationship_settings(id) ON DELETE CASCADE,
  endpoint text NOT NULL,
  p256dh text NOT NULL,
  auth text NOT NULL,
  device_label text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  last_success_at timestamptz,
  failure_count integer NOT NULL DEFAULT 0 CHECK (failure_count >= 0),
  disabled_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS push_subscriptions_endpoint_key
  ON public.push_subscriptions(endpoint);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id
  ON public.push_subscriptions(user_id);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_relationship_id
  ON public.push_subscriptions(relationship_id);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_relationship_active
  ON public.push_subscriptions(relationship_id)
  WHERE disabled_at IS NULL;

CREATE TABLE IF NOT EXISTS public.push_delivery_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_key text NOT NULL UNIQUE,
  relationship_id uuid NOT NULL REFERENCES public.relationship_settings(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type text NOT NULL CHECK (event_type IN (
    'partner_created_memory',
    'time_capsule_unlocked',
    'collaborative_capsule_waiting',
    'test'
  )),
  target_memory_id uuid REFERENCES public.memories(id) ON DELETE SET NULL,
  sent integer NOT NULL DEFAULT 0 CHECK (sent >= 0),
  expired integer NOT NULL DEFAULT 0 CHECK (expired >= 0),
  failed integer NOT NULL DEFAULT 0 CHECK (failed >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_push_delivery_events_relationship_created
  ON public.push_delivery_events(relationship_id, created_at DESC);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_delivery_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own push subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users can view own push subscriptions"
  ON public.push_subscriptions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can create own push subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users can create own push subscriptions"
  ON public.push_subscriptions FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND public.is_relationship_member(relationship_id)
  );

DROP POLICY IF EXISTS "Users can update own push subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users can update own push subscriptions"
  ON public.push_subscriptions FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (
    user_id = auth.uid()
    AND public.is_relationship_member(relationship_id)
  );

DROP POLICY IF EXISTS "Users can delete own push subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users can delete own push subscriptions"
  ON public.push_subscriptions FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "No client push delivery event reads" ON public.push_delivery_events;
CREATE POLICY "No client push delivery event reads"
  ON public.push_delivery_events FOR SELECT
  TO authenticated
  USING (false);

DROP POLICY IF EXISTS "No client push delivery event writes" ON public.push_delivery_events;
CREATE POLICY "No client push delivery event writes"
  ON public.push_delivery_events FOR INSERT
  TO authenticated
  WITH CHECK (false);

DROP POLICY IF EXISTS "No client push delivery event updates" ON public.push_delivery_events;
CREATE POLICY "No client push delivery event updates"
  ON public.push_delivery_events FOR UPDATE
  TO authenticated
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS "No client push delivery event deletes" ON public.push_delivery_events;
CREATE POLICY "No client push delivery event deletes"
  ON public.push_delivery_events FOR DELETE
  TO authenticated
  USING (false);

CREATE OR REPLACE FUNCTION public.touch_push_subscription_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_push_subscriptions_updated_at ON public.push_subscriptions;
CREATE TRIGGER trg_push_subscriptions_updated_at
BEFORE UPDATE ON public.push_subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.touch_push_subscription_updated_at();

GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_subscriptions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_subscriptions TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_delivery_events TO service_role;
REVOKE ALL ON public.push_subscriptions FROM anon;
REVOKE ALL ON public.push_delivery_events FROM anon, authenticated;