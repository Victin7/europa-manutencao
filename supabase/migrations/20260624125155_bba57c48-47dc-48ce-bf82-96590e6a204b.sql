DROP POLICY IF EXISTS "Authenticated read manutencoes files" ON storage.objects;
CREATE POLICY "Admins read manutencoes files" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'manutencoes' AND private.has_role(auth.uid(), 'admin'));