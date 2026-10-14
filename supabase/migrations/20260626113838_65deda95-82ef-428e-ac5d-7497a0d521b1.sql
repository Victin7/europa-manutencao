
-- Add avatar_url to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Storage policies for avatars bucket
-- Owners can manage files under a path prefixed by their user id
DROP POLICY IF EXISTS "avatars_owner_read" ON storage.objects;
DROP POLICY IF EXISTS "avatars_owner_write" ON storage.objects;
DROP POLICY IF EXISTS "avatars_owner_update" ON storage.objects;
DROP POLICY IF EXISTS "avatars_owner_delete" ON storage.objects;
DROP POLICY IF EXISTS "avatars_admin_all" ON storage.objects;

CREATE POLICY "avatars_owner_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "avatars_owner_write" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "avatars_owner_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "avatars_owner_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "avatars_admin_all" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'avatars' AND private.has_role(auth.uid(), 'admin'))
  WITH CHECK (bucket_id = 'avatars' AND private.has_role(auth.uid(), 'admin'));
