-- Optional YouTube soundtrack associated with a memory.
-- Existing rows remain unchanged and no access policy is modified.
ALTER TABLE public.memories
  ADD COLUMN IF NOT EXISTS soundtrack jsonb;

ALTER TABLE public.memories
  DROP CONSTRAINT IF EXISTS memories_soundtrack_shape;

ALTER TABLE public.memories
  ADD CONSTRAINT memories_soundtrack_shape
  CHECK (
    soundtrack IS NULL
    OR (
      jsonb_typeof(soundtrack) = 'object'
      AND soundtrack ? 'source_kind'
      AND soundtrack ? 'title'
      AND soundtrack->>'source_kind' IN ('youtube_video', 'youtube_playlist')
      AND length(soundtrack->>'title') BETWEEN 1 AND 200
      AND (
        NOT (soundtrack ? 'artist')
        OR soundtrack->'artist' = 'null'::jsonb
        OR jsonb_typeof(soundtrack->'artist') = 'string'
      )
      AND (
        NOT (soundtrack ? 'artwork_url')
        OR soundtrack->'artwork_url' = 'null'::jsonb
        OR jsonb_typeof(soundtrack->'artwork_url') = 'string'
      )
      AND CASE soundtrack->>'source_kind'
        WHEN 'youtube_video' THEN
          soundtrack ? 'video_id'
          AND soundtrack ? 'playlist_id'
          AND soundtrack ? 'playlist_index'
          AND soundtrack->>'video_id' ~ '^[A-Za-z0-9_-]{6,32}$'
          AND soundtrack->'playlist_id' = 'null'::jsonb
          AND soundtrack->'playlist_index' = 'null'::jsonb
        WHEN 'youtube_playlist' THEN
          soundtrack ? 'video_id'
          AND soundtrack ? 'playlist_id'
          AND soundtrack ? 'playlist_index'
          AND soundtrack->>'playlist_id' ~ '^[A-Za-z0-9_-]{6,64}$'
          AND (
            soundtrack->'video_id' = 'null'::jsonb
            OR soundtrack->>'video_id' ~ '^[A-Za-z0-9_-]{6,32}$'
          )
          AND jsonb_typeof(soundtrack->'playlist_index') = 'number'
          AND (soundtrack->>'playlist_index')::numeric >= 0
          AND (soundtrack->>'playlist_index')::numeric = trunc((soundtrack->>'playlist_index')::numeric)
        ELSE false
      END
    )
  );

COMMENT ON COLUMN public.memories.soundtrack IS
  'Optional privacy-safe YouTube soundtrack metadata selected for this memory.';
