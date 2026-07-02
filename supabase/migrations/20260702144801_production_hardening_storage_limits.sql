-- 20260702144801_production_hardening_storage_limits.sql

-- ==========================================
-- 1. CONFIGURE BUCKET LIMITS
-- ==========================================

-- memory-images: Max 10MB, images only
UPDATE storage.buckets
SET 
  file_size_limit = 10485760, -- 10MB
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic', 'image/avif']
WHERE id = 'memory-images';

-- memory-voices: Max 25MB, audio only
UPDATE storage.buckets
SET 
  file_size_limit = 26214400, -- 25MB
  allowed_mime_types = ARRAY['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/aac', 'audio/mp4', 'audio/webm']
WHERE id = 'memory-voices';

-- memory-videos: Max 100MB, video only
UPDATE storage.buckets
SET 
  file_size_limit = 104857600, -- 100MB
  allowed_mime_types = ARRAY['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime']
WHERE id = 'memory-videos';

-- memory-thumbnails: Max 10MB, images only
UPDATE storage.buckets
SET 
  file_size_limit = 10485760, -- 10MB
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp']
WHERE id = 'memory-thumbnails';
