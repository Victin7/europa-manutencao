
-- Add Local da Manutenção structure
ALTER TABLE public.manutencoes
  ADD COLUMN IF NOT EXISTS local_manutencao TEXT,
  ADD COLUMN IF NOT EXISTS torre TEXT,
  ADD COLUMN IF NOT EXISTS area_comum TEXT;

-- Allow unidade to be null (Geral records have no unit)
ALTER TABLE public.manutencoes ALTER COLUMN unidade DROP NOT NULL;

-- Backfill existing rows as Geral so they remain valid
UPDATE public.manutencoes SET local_manutencao = 'Geral' WHERE local_manutencao IS NULL;

ALTER TABLE public.manutencoes
  ALTER COLUMN local_manutencao SET NOT NULL,
  ALTER COLUMN local_manutencao SET DEFAULT 'Geral';

-- Validation: ensure correct fields are populated for each local type
CREATE OR REPLACE FUNCTION public.validate_manutencao_local()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.local_manutencao = 'Geral' THEN
    NEW.torre := NULL;
    NEW.unidade := NULL;
    IF NEW.area_comum IS NULL OR NEW.area_comum = '' THEN
      RAISE EXCEPTION 'Área comum é obrigatória quando o local for Geral';
    END IF;
  ELSE
    NEW.area_comum := NULL;
    NEW.torre := NEW.local_manutencao;
    IF NEW.unidade IS NULL OR NEW.unidade = '' THEN
      RAISE EXCEPTION 'Unidade é obrigatória quando o local for uma torre';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.validate_manutencao_local() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_validate_manutencao_local ON public.manutencoes;
CREATE TRIGGER trg_validate_manutencao_local
  BEFORE INSERT OR UPDATE ON public.manutencoes
  FOR EACH ROW EXECUTE FUNCTION public.validate_manutencao_local();
