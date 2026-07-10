-- Storage cleanup scheduling template
-- Replace <PROJECT_REF> and <STORAGE_CLEANUP_SECRET> before applying.
-- This schedule stays in DRY RUN mode by default.

CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$
DECLARE
  existing_job_id bigint;
BEGIN
  SELECT jobid INTO existing_job_id
  FROM cron.job
  WHERE jobname = 'storage-cleanup-dry-run';

  IF existing_job_id IS NOT NULL THEN
    PERFORM cron.unschedule(existing_job_id);
  END IF;
END
$$;

SELECT cron.schedule(
  'storage-cleanup-dry-run',
  '0 3 * * *',
  $$
  SELECT net.http_post(
    url := 'https://<PROJECT_REF>.supabase.co/functions/v1/storage-cleanup',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cleanup-secret', '<STORAGE_CLEANUP_SECRET>'
    ),
    body := '{"dryRun":true,"limit":100}'::jsonb
  );
  $$
);

-- After a reviewed dry run, switch to a separate destructive job manually.
-- Example body for approved deletion:
-- '{"dryRun":false,"limit":100}'::jsonb
