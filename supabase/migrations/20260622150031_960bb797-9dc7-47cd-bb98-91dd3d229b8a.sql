
-- Novos campos
ALTER TABLE public.manutencoes
  ADD COLUMN IF NOT EXISTS foto_antes jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS foto_depois jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS valor_material numeric(12,2),
  ADD COLUMN IF NOT EXISTS valor_mao_obra numeric(12,2),
  ADD COLUMN IF NOT EXISTS valor_total numeric(12,2) GENERATED ALWAYS AS (COALESCE(valor_material,0) + COALESCE(valor_mao_obra,0)) STORED,
  ADD COLUMN IF NOT EXISTS data_impressao timestamptz,
  ADD COLUMN IF NOT EXISTS numero_os text;

-- Sequência e geração automática do numero_os
CREATE SEQUENCE IF NOT EXISTS public.manutencoes_os_seq START 1;

CREATE OR REPLACE FUNCTION public.set_numero_os()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.numero_os IS NULL OR NEW.numero_os = '' THEN
    NEW.numero_os := 'OS-' || LPAD(nextval('public.manutencoes_os_seq')::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_numero_os ON public.manutencoes;
CREATE TRIGGER trg_set_numero_os
  BEFORE INSERT ON public.manutencoes
  FOR EACH ROW EXECUTE FUNCTION public.set_numero_os();

-- Preencher numero_os nas linhas existentes
UPDATE public.manutencoes
SET numero_os = 'OS-' || LPAD(nextval('public.manutencoes_os_seq')::TEXT, 4, '0')
WHERE numero_os IS NULL OR numero_os = '';

ALTER TABLE public.manutencoes
  ALTER COLUMN numero_os SET NOT NULL,
  ADD CONSTRAINT manutencoes_numero_os_unique UNIQUE (numero_os);

-- Realtime
ALTER TABLE public.manutencoes REPLICA IDENTITY FULL;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'manutencoes'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.manutencoes';
  END IF;
END $$;
