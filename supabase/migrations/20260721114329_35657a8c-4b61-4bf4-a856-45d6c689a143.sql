ALTER TABLE public.ativos
  ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES public.ativos(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS nivel integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tipo text NOT NULL DEFAULT 'ativo',
  ADD COLUMN IF NOT EXISTS status_ativo text NOT NULL DEFAULT 'operacional',
  ADD COLUMN IF NOT EXISTS ultima_manutencao date,
  ADD COLUMN IF NOT EXISTS proxima_preventiva date,
  ADD COLUMN IF NOT EXISTS empresa_responsavel text,
  ADD COLUMN IF NOT EXISTS numero_serie text,
  ADD COLUMN IF NOT EXISTS garantia_ate date,
  ADD COLUMN IF NOT EXISTS manual_path text;

CREATE INDEX IF NOT EXISTS ativos_parent_id_idx ON public.ativos(parent_id);
CREATE INDEX IF NOT EXISTS ativos_tipo_idx ON public.ativos(tipo);