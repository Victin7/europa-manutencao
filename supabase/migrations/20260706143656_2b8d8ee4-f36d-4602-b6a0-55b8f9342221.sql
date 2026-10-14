
-- ============ PRESTADORES ============
CREATE TABLE public.prestadores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_empresa text NOT NULL,
  responsavel text,
  cnpj text,
  telefone text,
  whatsapp text,
  email text,
  categoria text NOT NULL DEFAULT 'Outros',
  status text NOT NULL DEFAULT 'ativa' CHECK (status IN ('ativa','em_avaliacao','inativa')),
  observacoes text,
  logo_path text,
  documentos jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.prestadores TO authenticated;
GRANT ALL ON public.prestadores TO service_role;
ALTER TABLE public.prestadores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "prestadores view auth"
  ON public.prestadores FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "prestadores insert manage"
  ON public.prestadores FOR INSERT TO authenticated
  WITH CHECK (private.has_any_role(auth.uid(), ARRAY['admin'::app_role,'sindico'::app_role,'subsindico'::app_role]));

CREATE POLICY "prestadores update manage"
  ON public.prestadores FOR UPDATE TO authenticated
  USING (private.has_any_role(auth.uid(), ARRAY['admin'::app_role,'sindico'::app_role,'subsindico'::app_role]))
  WITH CHECK (private.has_any_role(auth.uid(), ARRAY['admin'::app_role,'sindico'::app_role,'subsindico'::app_role]));

CREATE POLICY "prestadores delete admin"
  ON public.prestadores FOR DELETE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER prestadores_touch_updated_at
  BEFORE UPDATE ON public.prestadores
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX prestadores_categoria_idx ON public.prestadores(categoria);
CREATE INDEX prestadores_status_idx ON public.prestadores(status);

-- ============ AVALIACOES ============
CREATE TABLE public.prestador_avaliacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prestador_id uuid NOT NULL REFERENCES public.prestadores(id) ON DELETE CASCADE,
  manutencao_id uuid,
  qualidade smallint NOT NULL DEFAULT 0 CHECK (qualidade BETWEEN 0 AND 5),
  organizacao smallint NOT NULL DEFAULT 0 CHECK (organizacao BETWEEN 0 AND 5),
  prazo smallint NOT NULL DEFAULT 0 CHECK (prazo BETWEEN 0 AND 5),
  atendimento smallint NOT NULL DEFAULT 0 CHECK (atendimento BETWEEN 0 AND 5),
  limpeza smallint NOT NULL DEFAULT 0 CHECK (limpeza BETWEEN 0 AND 5),
  nota_geral numeric(3,2) NOT NULL DEFAULT 0,
  comentario text,
  avaliado_por uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.prestador_avaliacoes TO authenticated;
GRANT ALL ON public.prestador_avaliacoes TO service_role;
ALTER TABLE public.prestador_avaliacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "avaliacoes view auth"
  ON public.prestador_avaliacoes FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "avaliacoes insert manage"
  ON public.prestador_avaliacoes FOR INSERT TO authenticated
  WITH CHECK (private.has_any_role(auth.uid(), ARRAY['admin'::app_role,'sindico'::app_role,'subsindico'::app_role]));

CREATE POLICY "avaliacoes update manage"
  ON public.prestador_avaliacoes FOR UPDATE TO authenticated
  USING (private.has_any_role(auth.uid(), ARRAY['admin'::app_role,'sindico'::app_role,'subsindico'::app_role]))
  WITH CHECK (private.has_any_role(auth.uid(), ARRAY['admin'::app_role,'sindico'::app_role,'subsindico'::app_role]));

CREATE POLICY "avaliacoes delete admin"
  ON public.prestador_avaliacoes FOR DELETE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX prestador_avaliacoes_prestador_idx ON public.prestador_avaliacoes(prestador_id);

-- ============ MANUTENCOES: NEW COLUMNS ============
ALTER TABLE public.manutencoes
  ADD COLUMN IF NOT EXISTS tipo_servico text NOT NULL DEFAULT 'interno' CHECK (tipo_servico IN ('interno','terceirizado')),
  ADD COLUMN IF NOT EXISTS prestador_id uuid REFERENCES public.prestadores(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS prestador_responsavel text,
  ADD COLUMN IF NOT EXISTS funcionario_acompanhante text,
  ADD COLUMN IF NOT EXISTS data_solicitacao timestamptz,
  ADD COLUMN IF NOT EXISTS data_agendada timestamptz,
  ADD COLUMN IF NOT EXISTS valor_servico numeric(12,2),
  ADD COLUMN IF NOT EXISTS garantia_dias integer,
  ADD COLUMN IF NOT EXISTS orcamentos jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS notas_fiscais jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS arts jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS laudos jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS relatorios jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS contratos jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS timeline_events jsonb NOT NULL DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS manutencoes_prestador_idx ON public.manutencoes(prestador_id);
CREATE INDEX IF NOT EXISTS manutencoes_tipo_servico_idx ON public.manutencoes(tipo_servico);
