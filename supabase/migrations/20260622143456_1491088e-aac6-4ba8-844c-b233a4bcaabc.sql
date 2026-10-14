
CREATE SEQUENCE IF NOT EXISTS public.manutencoes_seq START 1;

CREATE TABLE public.manutencoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  numero_chamado TEXT NOT NULL UNIQUE,
  unidade TEXT NOT NULL,
  data_vistoria DATE,
  funcionario TEXT,
  descricao TEXT NOT NULL,
  categoria TEXT NOT NULL,
  prioridade TEXT NOT NULL DEFAULT 'Média',
  status TEXT NOT NULL DEFAULT 'Pendente',
  data_inicio DATE,
  data_conclusao TIMESTAMPTZ,
  observacao TEXT,
  fotos JSONB NOT NULL DEFAULT '[]'::jsonb,
  documentos JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.manutencoes TO authenticated;
GRANT ALL ON public.manutencoes TO service_role;

ALTER TABLE public.manutencoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view manutencoes" ON public.manutencoes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert manutencoes" ON public.manutencoes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update manutencoes" ON public.manutencoes FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated can delete manutencoes" ON public.manutencoes FOR DELETE TO authenticated USING (true);

-- Auto-number trigger
CREATE OR REPLACE FUNCTION public.set_numero_chamado()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.numero_chamado IS NULL OR NEW.numero_chamado = '' THEN
    NEW.numero_chamado := 'MAN-' || LPAD(nextval('public.manutencoes_seq')::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_set_numero_chamado BEFORE INSERT ON public.manutencoes
FOR EACH ROW EXECUTE FUNCTION public.set_numero_chamado();

-- Updated_at + auto data_conclusao
CREATE OR REPLACE FUNCTION public.manutencoes_before_update()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at := now();
  IF NEW.status = 'Concluído' AND (OLD.status IS DISTINCT FROM 'Concluído') AND NEW.data_conclusao IS NULL THEN
    NEW.data_conclusao := now();
  END IF;
  IF NEW.status <> 'Concluído' THEN
    NEW.data_conclusao := NULL;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_manutencoes_before_update BEFORE UPDATE ON public.manutencoes
FOR EACH ROW EXECUTE FUNCTION public.manutencoes_before_update();
