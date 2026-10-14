DROP POLICY IF EXISTS "Authenticated users can view manutencoes" ON public.manutencoes;
DROP POLICY IF EXISTS "Authenticated users can insert manutencoes" ON public.manutencoes;
DROP POLICY IF EXISTS "Authenticated users can update manutencoes" ON public.manutencoes;
DROP POLICY IF EXISTS "Authenticated users can delete manutencoes" ON public.manutencoes;

CREATE POLICY "Authenticated users can view manutencoes"
ON public.manutencoes
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert manutencoes"
ON public.manutencoes
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update manutencoes"
ON public.manutencoes
FOR UPDATE
TO authenticated
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete manutencoes"
ON public.manutencoes
FOR DELETE
TO authenticated
USING (auth.uid() IS NOT NULL);