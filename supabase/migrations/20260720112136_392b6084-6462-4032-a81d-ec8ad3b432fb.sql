DROP POLICY IF EXISTS "avaliacoes insert manage" ON public.prestador_avaliacoes;
CREATE POLICY "avaliacoes insert manage" ON public.prestador_avaliacoes
FOR INSERT TO authenticated
WITH CHECK (
  avaliado_por = auth.uid()
  AND private.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'sindico'::app_role, 'subsindico'::app_role])
);