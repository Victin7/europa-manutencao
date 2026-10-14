-- Restrict manutencoes access to admins only
DROP POLICY IF EXISTS "Authenticated users can view manutencoes" ON public.manutencoes;
DROP POLICY IF EXISTS "Authenticated users can insert manutencoes" ON public.manutencoes;
DROP POLICY IF EXISTS "Authenticated users can update manutencoes" ON public.manutencoes;
DROP POLICY IF EXISTS "Authenticated users can delete manutencoes" ON public.manutencoes;

CREATE POLICY "Admins can view manutencoes" ON public.manutencoes
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert manutencoes" ON public.manutencoes
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update manutencoes" ON public.manutencoes
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete manutencoes" ON public.manutencoes
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));