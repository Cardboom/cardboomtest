-- Update avatar bucket to allow 10MB uploads
UPDATE storage.buckets 
SET file_size_limit = 10485760 
WHERE id = 'avatars';

-- Also update card-images bucket to have proper limits
UPDATE storage.buckets 
SET file_size_limit = 10485760,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
WHERE id = 'card-images';