
-- 1) Tighten SELECT policy on manutencoes to admins only
DROP POLICY IF EXISTS "Authenticated can view manutencoes" ON public.manutencoes;
CREATE POLICY "Admins can view manutencoes"
  ON public.manutencoes FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- 2) Move has_role out of public (API) schema to a private schema
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated, service_role;

-- Recreate policies on manutencoes to reference private.has_role
DROP POLICY IF EXISTS "Admins can view manutencoes" ON public.manutencoes;
DROP POLICY IF EXISTS "Admins can insert manutencoes" ON public.manutencoes;
DROP POLICY IF EXISTS "Admins can update manutencoes" ON public.manutencoes;
DROP POLICY IF EXISTS "Admins can delete manutencoes" ON public.manutencoes;

CREATE POLICY "Admins can view manutencoes" ON public.manutencoes
  FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins can insert manutencoes" ON public.manutencoes
  FOR INSERT TO authenticated
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins can update manutencoes" ON public.manutencoes
  FOR UPDATE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins can delete manutencoes" ON public.manutencoes
  FOR DELETE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role));

-- Now lock down the public.has_role since it is no longer referenced by policies
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;

-- 3) Revoke EXECUTE on internal SECURITY DEFINER trigger helpers from API roles
REVOKE ALL ON FUNCTION public.handle_new_user_role() FROM PUBLIC, anon, authenticated;
