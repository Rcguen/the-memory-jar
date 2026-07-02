-- 1. Create Enums
DO $$ BEGIN
    CREATE TYPE public.memory_theme_enum AS ENUM (
        'modern', 'vintage', 'romantic', 'dark', 'sakura', 'typewriter', 'nature', 'dream'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.paper_style_enum AS ENUM (
        'letter', 'folded_letter', 'diary', 'postcard', 'notebook', 'parchment'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Alter memories table to use Enums
ALTER TABLE public.memories 
    ALTER COLUMN theme DROP DEFAULT,
    ALTER COLUMN theme TYPE public.memory_theme_enum USING (theme::public.memory_theme_enum),
    ALTER COLUMN theme SET DEFAULT 'modern'::public.memory_theme_enum;

ALTER TABLE public.memories
    ADD COLUMN IF NOT EXISTS paper_style public.paper_style_enum NOT NULL DEFAULT 'letter'::public.paper_style_enum;

-- 3. Add CHECK constraint for JSONB decorations
-- Note: A Postgres function could strictly check values, but keeping it light and idempotent:
ALTER TABLE public.memories DROP CONSTRAINT IF EXISTS chk_decorations_valid;
ALTER TABLE public.memories ADD CONSTRAINT chk_decorations_valid 
    CHECK (jsonb_typeof(decorations) = 'array' AND jsonb_array_length(decorations) <= 4);

-- 4. Create Indexes
CREATE INDEX IF NOT EXISTS idx_memories_theme ON public.memories (theme);
CREATE INDEX IF NOT EXISTS idx_memories_paper_style ON public.memories (paper_style);
