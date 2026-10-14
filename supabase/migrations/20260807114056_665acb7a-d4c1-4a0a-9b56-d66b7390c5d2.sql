CREATE TABLE IF NOT EXISTS public.manutencao_equipe (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  manutencao_id uuid NOT NULL REFERENCES public.manutencoes(id) ON DELETE CASCADE,
  nome_funcionario text NOT NULL,
  adicionado_em timestamptz NOT NULL DEFAULT now(),
  adicionado_por uuid REFERENCES auth.users(id),
  UNIQUE(manutencao_id, nome_funcionario)
);

CREATE INDEX IF NOT EXISTS idx_manutencao_equipe_manutencao ON public.manutencao_equipe(manutencao_id);
CREATE INDEX IF NOT EXISTS idx_manutencao_equipe_funcionario ON public.manutencao_equipe(nome_funcionario);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.manutencao_equipe TO authenticated;
GRANT ALL ON public.manutencao_equipe TO service_role;

ALTER TABLE public.manutencao_equipe ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados leem equipe"
  ON public.manutencao_equipe FOR SELECT
  TO authenticated
  USING (private.has_any_role(auth.uid(), ARRAY['admin'::app_role,'sindico'::app_role,'subsindico'::app_role,'conselheiro'::app_role]));

CREATE POLICY "Admin e sindico gerenciam equipe"
  ON public.manutencao_equipe FOR ALL
  TO authenticated
  USING (private.has_any_role(auth.uid(), ARRAY['admin'::app_role,'sindico'::app_role,'subsindico'::app_role]))
  WITH CHECK (private.has_any_role(auth.uid(), ARRAY['admin'::app_role,'sindico'::app_role,'subsindico'::app_role]));

INSERT INTO public.manutencao_equipe (manutencao_id, nome_funcionario)
SELECT id, funcionario
FROM public.manutencoes
WHERE funcionario IS NOT NULL AND funcionario <> ''
ON CONFLICT (manutencao_id, nome_funcionario) DO NOTHING;