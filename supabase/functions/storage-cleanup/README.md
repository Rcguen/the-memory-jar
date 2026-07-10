# Storage Cleanup

This Edge Function permanently removes only memories that were already soft-deleted and have aged past the retention window.

## Safety model

- Requires `POST`
- Requires a server-side secret in either `x-cleanup-secret` or `Authorization: Bearer ...`
- Defaults to `dryRun: true` unless explicitly disabled by env or request body
- Refuses to delete attachment objects that are still referenced by any non-deleted memory
- Reports missing attachment objects and orphan storage objects separately
- Writes every run to `public.storage_cleanup_runs` and `public.storage_cleanup_items`

## Required secrets

Configure these in Supabase Edge Function secrets, not in the frontend and not in Git:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `STORAGE_CLEANUP_SECRET`
- Optional: `STORAGE_CLEANUP_RETENTION_DAYS`
- Optional: `STORAGE_CLEANUP_BATCH_LIMIT`
- Optional: `STORAGE_CLEANUP_DEFAULT_DRY_RUN`

## Deploy

```bash
supabase functions deploy storage-cleanup --no-verify-jwt
```

JWT verification stays disabled because the scheduler will call this function with a server-side shared secret header, not with an end-user JWT.

## Dry run request

```bash
curl -X POST \
  "https://<PROJECT_REF>.supabase.co/functions/v1/storage-cleanup" \
  -H "Content-Type: application/json" \
  -H "x-cleanup-secret: <STORAGE_CLEANUP_SECRET>" \
  -d '{"dryRun":true,"limit":100}'
```

Expected response includes:

- `summary.candidateMemories`
- `summary.candidateAttachments`
- `summary.orphanObjects`
- `summary.missingObjects`
- `summary.protectedObjects`
- `blockedMemoryIds`

## Scheduling

Use the SQL template in `supabase/functions/storage-cleanup/schedule.sql`.

The prepared schedule is dry-run only by default. Do not switch the scheduled body to `{"dryRun":false}` until the dry-run report is reviewed and explicitly approved.
