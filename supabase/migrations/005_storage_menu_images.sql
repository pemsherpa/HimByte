-- Supabase Storage: public bucket for menu item images
-- Run in SQL Editor after linking project. Adjust policies if you use custom roles.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'menu-images',
  'menu-images',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Public read (bucket is public; objects inherit)
DROP POLICY IF EXISTS "Public read menu images" ON storage.objects;
CREATE POLICY "Public read menu images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'menu-images');

-- Staff: upload only under their restaurant folder: {restaurant_id}/{filename}
DROP POLICY IF EXISTS "Restaurant staff upload menu images" ON storage.objects;
CREATE POLICY "Restaurant staff upload menu images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'menu-images'
    AND (
      split_part(name, '/', 1) = (SELECT restaurant_id::text FROM public.profiles WHERE id = auth.uid() LIMIT 1)
      OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
    )
  );

DROP POLICY IF EXISTS "Restaurant staff update menu images" ON storage.objects;
CREATE POLICY "Restaurant staff update menu images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'menu-images'
    AND (
      split_part(name, '/', 1) = (SELECT restaurant_id::text FROM public.profiles WHERE id = auth.uid() LIMIT 1)
      OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
    )
  );

DROP POLICY IF EXISTS "Restaurant staff delete menu images" ON storage.objects;
CREATE POLICY "Restaurant staff delete menu images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'menu-images'
    AND (
      split_part(name, '/', 1) = (SELECT restaurant_id::text FROM public.profiles WHERE id = auth.uid() LIMIT 1)
      OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
    )
  );
