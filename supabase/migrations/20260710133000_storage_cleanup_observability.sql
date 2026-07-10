CREATE TABLE IF NOT EXISTS public.storage_cleanup_runs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  mode text NOT NULL CHECK (mode IN ('dry_run', 'delete')),
  status text NOT NULL CHECK (status IN ('running', 'completed', 'failed')),
  retention_days integer NOT NULL,
  batch_limit integer NOT NULL,
  candidate_memories integer NOT NULL DEFAULT 0,
  candidate_attachments integer NOT NULL DEFAULT 0,
  deleted_memories integer NOT NULL DEFAULT 0,
  deleted_objects integer NOT NULL DEFAULT 0,
  orphan_objects integer NOT NULL DEFAULT 0,
  missing_objects integer NOT NULL DEFAULT 0,
  protected_objects integer NOT NULL DEFAULT 0,
  error_message text,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  finished_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.storage_cleanup_items (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  run_id uuid NOT NULL REFERENCES public.storage_cleanup_runs(id) ON DELETE CASCADE,
  relationship_id uuid REFERENCES public.relationship_settings(id) ON DELETE SET NULL,
  memory_id uuid REFERENCES public.memories(id) ON DELETE SET NULL,
  attachment_id uuid,
  bucket text,
  object_path text,
  item_kind text NOT NULL CHECK (item_kind IN ('memory', 'attachment', 'orphan_object')),
  action text NOT NULL,
  outcome text NOT NULL,
  detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_storage_cleanup_runs_created_at
  ON public.storage_cleanup_runs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_storage_cleanup_runs_status
  ON public.storage_cleanup_runs(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_storage_cleanup_items_run_id
  ON public.storage_cleanup_items(run_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_storage_cleanup_items_memory_id
  ON public.storage_cleanup_items(memory_id);

ALTER TABLE public.storage_cleanup_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.storage_cleanup_items ENABLE ROW LEVEL SECURITY;
