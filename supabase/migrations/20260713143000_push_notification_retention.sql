-- ================================================================
-- Push notification retention maintenance.
-- Server-only helper for scheduled/admin cleanup of notification
-- observability rows. Does not touch memories, attachments, or Storage.
-- ================================================================

CREATE OR REPLACE FUNCTION public.cleanup_push_notification_retention(
  delivery_retention interval DEFAULT interval '90 days',
  disabled_subscription_retention interval DEFAULT interval '30 days'
)
RETURNS TABLE (
  deleted_delivery_events integer,
  deleted_disabled_subscriptions integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  delivery_count integer := 0;
  subscription_count integer := 0;
BEGIN
  IF delivery_retention IS NULL OR delivery_retention < interval '1 day' THEN
    RAISE EXCEPTION 'delivery_retention must be at least 1 day';
  END IF;

  IF disabled_subscription_retention IS NULL OR disabled_subscription_retention < interval '1 day' THEN
    RAISE EXCEPTION 'disabled_subscription_retention must be at least 1 day';
  END IF;

  DELETE FROM public.push_delivery_events
  WHERE created_at < now() - delivery_retention;
  GET DIAGNOSTICS delivery_count = ROW_COUNT;

  DELETE FROM public.push_subscriptions
  WHERE disabled_at IS NOT NULL
    AND disabled_at < now() - disabled_subscription_retention;
  GET DIAGNOSTICS subscription_count = ROW_COUNT;

  deleted_delivery_events := delivery_count;
  deleted_disabled_subscriptions := subscription_count;
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.cleanup_push_notification_retention(interval, interval) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cleanup_push_notification_retention(interval, interval) TO service_role;
