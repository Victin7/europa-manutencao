
-- 1. Private schema for security helpers (not exposed via PostgREST)
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

-- 2. Recreate has_role in private schema
CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated, service_role;

-- 3. Recreate policies on public.manutencoes to use private.has_role
DROP POLICY IF EXISTS "Admins can view manutencoes" ON public.manutencoes;
DROP POLICY IF EXISTS "Admins can insert manutencoes" ON public.manutencoes;
DROP POLICY IF EXISTS "Admins can update manutencoes" ON public.manutencoes;
DROP POLICY IF EXISTS "Admins can delete manutencoes" ON public.manutencoes;

CREATE POLICY "Admins can view manutencoes" ON public.manutencoes
  FOR SELECT TO authenticated USING (private.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert manutencoes" ON public.manutencoes
  FOR INSERT TO authenticated WITH CHECK (private.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update manutencoes" ON public.manutencoes
  FOR UPDATE TO authenticated USING (private.has_role(auth.uid(), 'admin')) WITH CHECK (private.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete manutencoes" ON public.manutencoes
  FOR DELETE TO authenticated USING (private.has_role(auth.uid(), 'admin'));

-- 4. Recreate storage.objects policies to use private.has_role
DROP POLICY IF EXISTS "Admins insert manutencoes files" ON storage.objects;
DROP POLICY IF EXISTS "Admins update manutencoes files" ON storage.objects;
DROP POLICY IF EXISTS "Admins delete manutencoes files" ON storage.objects;

CREATE POLICY "Admins insert manutencoes files" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'manutencoes' AND private.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update manutencoes files" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'manutencoes' AND private.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete manutencoes files" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'manutencoes' AND private.has_role(auth.uid(), 'admin'));

-- 5. Recreate realtime.messages policy to use private.has_role
DROP POLICY IF EXISTS "Admins can read realtime messages" ON realtime.messages;
CREATE POLICY "Admins can read realtime messages" ON realtime.messages
  FOR SELECT TO authenticated USING (private.has_role(auth.uid(), 'admin'));

-- 6. Drop the publicly-exposed has_role from public schema
DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role);
