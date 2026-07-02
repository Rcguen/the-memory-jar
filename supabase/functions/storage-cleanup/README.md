# Storage Cleanup Cron Job

This Supabase Edge Function is designed to run automatically every day to clean up soft-deleted memories that have exceeded the 30-day retention period.

## 1. Deploy the Function

Deploy the function to your Supabase project:
```bash
supabase functions deploy storage-cleanup --no-verify-jwt
```
*Note: We disable JWT verification so `pg_net` can call it without passing an auth user token. The function relies on the `SUPABASE_SERVICE_ROLE_KEY` to authenticate with the database.*

## 2. Schedule using pg_cron

Run the following SQL in your Supabase SQL Editor to schedule the function to run daily at 3:00 AM using `pg_cron` and `pg_net`.

```sql
-- Enable the necessary extensions
CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create the cron job
SELECT cron.schedule(
  'storage-cleanup-job', 
  '0 3 * * *', -- Run at 3:00 AM every day
  $$
  SELECT net.http_post(
      url:='https://<YOUR_PROJECT_REF>.supabase.co/functions/v1/storage-cleanup',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer <YOUR_ANON_OR_SERVICE_KEY>"}'::jsonb,
      body:='{}'::jsonb
  ) as request_id;
  $$
);
```

### Checking Logs
You can view the cleanup logs in your Supabase Dashboard under Edge Functions -> `storage-cleanup` -> Logs.
