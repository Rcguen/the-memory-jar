-- Remove the legacy singleton restriction from the original single-couple architecture
-- This enables multiple relationship_settings rows for the multi-couple architecture
DROP INDEX IF EXISTS public.relationship_settings_single_row_idx;
