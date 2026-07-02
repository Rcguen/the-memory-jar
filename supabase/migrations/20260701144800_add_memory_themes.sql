-- Add theme and decorations columns to memories table
ALTER TABLE public.memories 
ADD COLUMN IF NOT EXISTS theme TEXT NOT NULL DEFAULT 'modern',
ADD COLUMN IF NOT EXISTS decorations JSONB NOT NULL DEFAULT '[]'::jsonb;
