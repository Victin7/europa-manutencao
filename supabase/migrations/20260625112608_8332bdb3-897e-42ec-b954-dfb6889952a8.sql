
DROP FUNCTION IF EXISTS public.is_principal_admin(uuid);
CREATE OR REPLACE FUNCTION private.is_principal_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM auth.users WHERE id = _user_id AND lower(email) = 'victor.vitinho1011@gmail.com');
$$;
REVOKE ALL ON FUNCTION private.is_principal_admin(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.is_principal_admin(uuid) TO authenticated, service_role;
