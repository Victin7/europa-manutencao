
CREATE POLICY "prestadores storage read"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'prestadores');

CREATE POLICY "prestadores storage insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'prestadores');

CREATE POLICY "prestadores storage update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'prestadores')
  WITH CHECK (bucket_id = 'prestadores');

CREATE POLICY "prestadores storage delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'prestadores');
