-- 20260702144802_production_hardening_indexes.sql

-- ==========================================
-- 1. ADD B-TREE INDEXES FOR PERFORMANCE
-- ==========================================

-- memories table
CREATE INDEX IF NOT EXISTS idx_memories_relationship_id ON public.memories (relationship_id);
CREATE INDEX IF NOT EXISTS idx_memories_created_by ON public.memories (created_by);
CREATE INDEX IF NOT EXISTS idx_memories_status ON public.memories (status);
CREATE INDEX IF NOT EXISTS idx_memories_unlock_at ON public.memories (unlock_at);
CREATE INDEX IF NOT EXISTS idx_memories_deleted_at ON public.memories (deleted_at);

-- Used heavily in initial load query:
-- .in("status", ["sealed", "unlocked", "opening"]).is("deleted_at", null)
-- A composite index can also help here:
CREATE INDEX IF NOT EXISTS idx_memories_status_deleted_at ON public.memories (status, deleted_at);

-- memory_attachments table
CREATE INDEX IF NOT EXISTS idx_memory_attachments_memory_id ON public.memory_attachments (memory_id);

-- memory_visual_state table
-- memory_id is already a UNIQUE constraint, which creates an index automatically.
-- We can add it just in case, or skip it. (Skipping it since UNIQUE(memory_id) handles it).

-- relationship_members table
CREATE INDEX IF NOT EXISTS idx_relationship_members_profile_id ON public.relationship_members (profile_id);
CREATE INDEX IF NOT EXISTS idx_relationship_members_relationship_id ON public.relationship_members (relationship_id);

-- memory_open_participants table
CREATE INDEX IF NOT EXISTS idx_memory_open_participants_memory_id ON public.memory_open_participants (memory_id);
