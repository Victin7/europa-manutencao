CREATE OR REPLACE FUNCTION public.validate_manutencao_local()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.local_manutencao = 'Geral' THEN
    NEW.torre := NULL;
    NEW.unidade := NULL;
    IF NEW.area_comum IS NULL OR NEW.area_comum = '' THEN
      RAISE EXCEPTION 'Área comum é obrigatória quando o local for Geral';
    END IF;
  ELSE
    NEW.torre := NEW.local_manutencao;
    IF NEW.area_comum IS NULL OR NEW.area_comum = '' THEN
      RAISE EXCEPTION 'Subtipo do local é obrigatório (Apartamento, Hall Social, Hall de Serviço, SS1/SS2/SS3 - Hall ...)';
    END IF;
    IF NEW.area_comum = 'Apartamento' THEN
      IF NEW.unidade IS NULL OR NEW.unidade = '' THEN
        RAISE EXCEPTION 'Unidade é obrigatória quando o subtipo for Apartamento';
      END IF;
    ELSE
      NEW.unidade := NULL;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;