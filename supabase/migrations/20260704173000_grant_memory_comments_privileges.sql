-- Allow authenticated relationship members to use engagement tables.
-- RLS policies still decide which rows each user can access.

GRANT SELECT, INSERT, UPDATE, DELETE ON public.memory_comments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.memory_reactions TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.memory_favorites TO authenticated;
GRANT SELECT ON public.activity_logs TO authenticated;
