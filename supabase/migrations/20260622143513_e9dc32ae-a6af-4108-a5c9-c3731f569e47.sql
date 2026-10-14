
CREATE POLICY "Authenticated read manutencoes files" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'manutencoes');
CREATE POLICY "Authenticated insert manutencoes files" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'manutencoes');
CREATE POLICY "Authenticated update manutencoes files" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'manutencoes');
CREATE POLICY "Authenticated delete manutencoes files" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'manutencoes');
