
-- ============ ATIVOS (patrimônios) ============
CREATE TABLE public.ativos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  categoria text NOT NULL,
  torre text,
  local text,
  codigo_interno text,
  fabricante text,
  modelo text,
  numero_patrimonio text,
  data_instalacao date,
  observacoes text,
  foto_path text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ativos TO authenticated;
GRANT ALL ON public.ativos TO service_role;

ALTER TABLE public.ativos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ativos view manage" ON public.ativos FOR SELECT TO authenticated
  USING (private.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'sindico'::app_role, 'subsindico'::app_role, 'conselheiro'::app_role]));
CREATE POLICY "ativos insert manage" ON public.ativos FOR INSERT TO authenticated
  WITH CHECK (private.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'sindico'::app_role, 'subsindico'::app_role]));
CREATE POLICY "ativos update manage" ON public.ativos FOR UPDATE TO authenticated
  USING (private.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'sindico'::app_role, 'subsindico'::app_role]))
  WITH CHECK (private.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'sindico'::app_role, 'subsindico'::app_role]));
CREATE POLICY "ativos delete admin" ON public.ativos FOR DELETE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER ativos_touch_updated_at BEFORE UPDATE ON public.ativos
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX ativos_torre_idx ON public.ativos(torre);
CREATE INDEX ativos_categoria_idx ON public.ativos(categoria);

-- ============ Vínculo com manutenções ============
ALTER TABLE public.manutencoes
  ADD COLUMN ativo_id uuid REFERENCES public.ativos(id) ON DELETE SET NULL;

CREATE INDEX manutencoes_ativo_id_idx ON public.manutencoes(ativo_id);

-- ============ Storage policies bucket 'ativos' ============
CREATE POLICY "ativos storage read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'ativos' AND private.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'sindico'::app_role, 'subsindico'::app_role, 'conselheiro'::app_role]));
CREATE POLICY "ativos storage insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'ativos' AND private.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'sindico'::app_role, 'subsindico'::app_role]));
CREATE POLICY "ativos storage update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'ativos' AND private.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'sindico'::app_role, 'subsindico'::app_role]));
CREATE POLICY "ativos storage delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'ativos' AND private.has_role(auth.uid(), 'admin'::app_role));

-- ============ Seed inicial de ativos ============
-- Elevadores
INSERT INTO public.ativos (nome, categoria, torre, local) VALUES
  ('Elevador Social - Final 1 (Lado Ímpar)', 'Elevador', 'Torre A', 'Elevadores'),
  ('Elevador Social - Final 2 (Lado Par)', 'Elevador', 'Torre A', 'Elevadores'),
  ('Elevador de Serviço', 'Elevador', 'Torre A', 'Elevadores'),
  ('Elevador Social', 'Elevador', 'Torre B', 'Elevadores'),
  ('Elevador de Serviço', 'Elevador', 'Torre B', 'Elevadores'),
  ('Elevador Social', 'Elevador', 'Torre C', 'Elevadores'),
  ('Elevador de Serviço', 'Elevador', 'Torre C', 'Elevadores'),
  ('Elevador Social', 'Elevador', 'Torre D', 'Elevadores'),
  ('Elevador de Serviço', 'Elevador', 'Torre D', 'Elevadores'),
  ('Elevador Social', 'Elevador', 'Torre E', 'Elevadores'),
  ('Elevador de Serviço', 'Elevador', 'Torre E', 'Elevadores'),
  ('Elevador Social', 'Elevador', 'Torre F', 'Elevadores'),
  ('Elevador de Serviço', 'Elevador', 'Torre F', 'Elevadores'),
  ('Elevador Social', 'Elevador', 'Torre G', 'Elevadores'),
  ('Elevador de Serviço', 'Elevador', 'Torre G', 'Elevadores');

-- Ativos gerais (área comum)
INSERT INTO public.ativos (nome, categoria, torre, local) VALUES
  ('Portão Principal de Acesso', 'Portão', 'Geral', 'Portaria'),
  ('Portão de Garagem', 'Portão', 'Geral', 'Garagem'),
  ('Motor do Portão Principal', 'Motor de Portão', 'Geral', 'Portaria'),
  ('Motor do Portão da Garagem', 'Motor de Portão', 'Geral', 'Garagem'),
  ('Bomba Recalque 1', 'Bomba', 'Geral', 'Casa de Bombas'),
  ('Bomba Recalque 2', 'Bomba', 'Geral', 'Casa de Bombas'),
  ('Bomba da Piscina', 'Bomba', 'Geral', 'Piscina'),
  ('Gerador Principal', 'Gerador', 'Geral', 'Casa de Bombas'),
  ('Sistema de CFTV', 'CFTV', 'Geral', 'Portaria'),
  ('Central de Interfones', 'Interfonia', 'Geral', 'Portaria'),
  ('Casa de Máquinas', 'Infraestrutura', 'Geral', 'Casa de Bombas'),
  ('Reservatório Superior', 'Reservatório', 'Geral', 'Reservatório'),
  ('Reservatório Inferior', 'Reservatório', 'Geral', 'Reservatório'),
  ('Central de Gás', 'Gás', 'Geral', 'Área Externa'),
  ('Academia', 'Área Comum', 'Geral', 'Academia'),
  ('Piscina Adulto', 'Área Comum', 'Geral', 'Piscina'),
  ('Piscina Infantil', 'Área Comum', 'Geral', 'Piscina'),
  ('Playground', 'Área Comum', 'Geral', 'Playground'),
  ('Brinquedoteca', 'Área Comum', 'Geral', 'Salão de Festas'),
  ('Pet Place', 'Área Comum', 'Geral', 'Espaço Pet'),
  ('Salão de Festas', 'Área Comum', 'Geral', 'Salão de Festas'),
  ('Salão Master', 'Área Comum', 'Geral', 'Salão Master'),
  ('Churrasqueiras', 'Área Comum', 'Geral', 'Churrasqueira');
