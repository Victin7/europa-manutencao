
CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS pin_hash text,
  ADD COLUMN IF NOT EXISTS pin_failed_attempts int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pin_locked_until timestamptz,
  ADD COLUMN IF NOT EXISTS pin_updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS is_principal boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.access_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  email text,
  perfil text,
  ip text,
  user_agent text,
  event text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.access_logs TO authenticated;
GRANT ALL ON public.access_logs TO service_role;
ALTER TABLE public.access_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read access logs" ON public.access_logs;
CREATE POLICY "Admins can read access logs"
  ON public.access_logs FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role));

CREATE INDEX IF NOT EXISTS access_logs_user_id_idx ON public.access_logs(user_id);
CREATE INDEX IF NOT EXISTS access_logs_created_at_idx ON public.access_logs(created_at DESC);

CREATE OR REPLACE FUNCTION private.verify_pin(_user_id uuid, _pin text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE _hash text;
BEGIN
  SELECT pin_hash INTO _hash FROM public.profiles WHERE user_id = _user_id;
  IF _hash IS NULL THEN RETURN false; END IF;
  RETURN crypt(_pin, _hash) = _hash;
END $$;
REVOKE ALL ON FUNCTION private.verify_pin(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.verify_pin(uuid, text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.set_pin(_user_id uuid, _pin text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
BEGIN
  IF _pin !~ '^[0-9]{4,6}$' THEN
    RAISE EXCEPTION 'PIN deve ter de 4 a 6 dígitos numéricos';
  END IF;
  UPDATE public.profiles
    SET pin_hash = crypt(_pin, gen_salt('bf')),
        pin_failed_attempts = 0,
        pin_locked_until = NULL,
        pin_updated_at = now()
    WHERE user_id = _user_id;
END $$;
REVOKE ALL ON FUNCTION private.set_pin(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.set_pin(uuid, text) TO service_role;

CREATE OR REPLACE FUNCTION public.is_principal_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM auth.users WHERE id = _user_id AND lower(email) = 'victor.vitinho1011@gmail.com');
$$;
REVOKE ALL ON FUNCTION public.is_principal_admin(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_principal_admin(uuid) TO authenticated, service_role;

DROP POLICY IF EXISTS "Conselheiro can read scoped" ON public.manutencoes;
CREATE POLICY "Conselheiro can read scoped"
  ON public.manutencoes FOR SELECT TO authenticated
  USING (
    private.has_role(auth.uid(), 'conselheiro'::public.app_role)
    AND (
      local_manutencao = 'Geral'
      OR torre = (SELECT torre FROM public.profiles WHERE user_id = auth.uid())
    )
  );

DO $$
DECLARE _uid uuid;
BEGIN
  SELECT id INTO _uid FROM auth.users WHERE lower(email) = 'victor.vitinho1011@gmail.com';
  IF _uid IS NOT NULL THEN
    INSERT INTO public.profiles (user_id, nome, status, is_principal)
      VALUES (_uid, 'Administrador Principal', 'ativo', true)
      ON CONFLICT (user_id) DO UPDATE SET is_principal = true;
    DELETE FROM public.user_roles WHERE user_id = _uid;
    INSERT INTO public.user_roles (user_id, role) VALUES (_uid, 'admin');
  END IF;
END $$;
