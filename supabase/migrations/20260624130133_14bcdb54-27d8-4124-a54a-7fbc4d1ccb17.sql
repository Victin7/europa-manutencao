GRANT SELECT, INSERT, UPDATE, DELETE ON public.manutencoes TO authenticated;
GRANT ALL ON public.manutencoes TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.manutencoes_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.manutencoes_os_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.manutencoes_seq TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.manutencoes_os_seq TO service_role;

DROP POLICY IF EXISTS "Admins can view manutencoes" ON public.manutencoes;
DROP POLICY IF EXISTS "Admins can insert manutencoes" ON public.manutencoes;
DROP POLICY IF EXISTS "Admins can update manutencoes" ON public.manutencoes;
DROP POLICY IF EXISTS "Admins can delete manutencoes" ON public.manutencoes;
DROP POLICY IF EXISTS "Authenticated users can view manutencoes" ON public.manutencoes;
DROP POLICY IF EXISTS "Authenticated users can insert manutencoes" ON public.manutencoes;
DROP POLICY IF EXISTS "Authenticated users can update manutencoes" ON public.manutencoes;
DROP POLICY IF EXISTS "Authenticated users can delete manutencoes" ON public.manutencoes;

CREATE POLICY "Authenticated users can view manutencoes"
ON public.manutencoes
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert manutencoes"
ON public.manutencoes
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update manutencoes"
ON public.manutencoes
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Authenticated users can delete manutencoes"
ON public.manutencoes
FOR DELETE
TO authenticated
USING (true);

DROP TRIGGER IF EXISTS set_numero_chamado_before_insert ON public.manutencoes;
DROP TRIGGER IF EXISTS set_numero_os_before_insert ON public.manutencoes;
DROP TRIGGER IF EXISTS validate_manutencao_local_before_insert_update ON public.manutencoes;
DROP TRIGGER IF EXISTS manutencoes_before_update_trigger ON public.manutencoes;

CREATE TRIGGER set_numero_chamado_before_insert
BEFORE INSERT ON public.manutencoes
FOR EACH ROW
EXECUTE FUNCTION public.set_numero_chamado();

CREATE TRIGGER set_numero_os_before_insert
BEFORE INSERT ON public.manutencoes
FOR EACH ROW
EXECUTE FUNCTION public.set_numero_os();

CREATE TRIGGER validate_manutencao_local_before_insert_update
BEFORE INSERT OR UPDATE ON public.manutencoes
FOR EACH ROW
EXECUTE FUNCTION public.validate_manutencao_local();

CREATE TRIGGER manutencoes_before_update_trigger
BEFORE UPDATE ON public.manutencoes
FOR EACH ROW
EXECUTE FUNCTION public.manutencoes_before_update();