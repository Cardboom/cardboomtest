-- Create storage bucket for storefront assets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'storefront-assets',
  'storefront-assets', 
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload their own storefront assets
CREATE POLICY "Users can upload storefront assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'storefront-assets' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.creator_storefronts WHERE user_id = auth.uid()
  )
);

-- Allow anyone to view storefront assets (public bucket)
CREATE POLICY "Storefront assets are publicly accessible"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'storefront-assets');

-- Allow users to update their own storefront assets
CREATE POLICY "Users can update own storefront assets"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'storefront-assets' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.creator_storefronts WHERE user_id = auth.uid()
  )
);

-- Allow users to delete their own storefront assets
CREATE POLICY "Users can delete own storefront assets"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'storefront-assets' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.creator_storefronts WHERE user_id = auth.uid()
  )
);