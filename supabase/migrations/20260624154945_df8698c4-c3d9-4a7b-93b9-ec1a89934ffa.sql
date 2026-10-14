
-- 1) Drop dependent policies (will be recreated)
DROP POLICY IF EXISTS "Admins can view manutencoes" ON public.manutencoes;
DROP POLICY IF EXISTS "Admins can insert manutencoes" ON public.manutencoes;
DROP POLICY IF EXISTS "Admins can update manutencoes" ON public.manutencoes;
DROP POLICY IF EXISTS "Admins can delete manutencoes" ON public.manutencoes;
DROP POLICY IF EXISTS "Admins read manutencoes files" ON storage.objects;
DROP POLICY IF EXISTS "Admins insert manutencoes files" ON storage.objects;
DROP POLICY IF EXISTS "Admins update manutencoes files" ON storage.objects;
DROP POLICY IF EXISTS "Admins delete manutencoes files" ON storage.objects;
DROP POLICY IF EXISTS "Admins can read realtime messages" ON realtime.messages;

-- 2) Drop existing has_role to allow enum rebuild
DROP FUNCTION IF EXISTS private.has_role(uuid, public.app_role);

-- 3) Rebuild app_role enum with new values
ALTER TABLE public.user_roles ALTER COLUMN role TYPE text USING role::text;
DROP TYPE public.app_role;
CREATE TYPE public.app_role AS ENUM ('admin','sindico','subsindico');
UPDATE public.user_roles SET role = 'sindico' WHERE role NOT IN ('admin','sindico','subsindico');
ALTER TABLE public.user_roles ALTER COLUMN role TYPE public.app_role USING role::public.app_role;

-- 4) Recreate has_role + new has_any_role in private schema
CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;
REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.has_any_role(_user_id uuid, _roles public.app_role[])
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = ANY(_roles)) $$;
REVOKE ALL ON FUNCTION private.has_any_role(uuid, public.app_role[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.has_any_role(uuid, public.app_role[]) TO authenticated, service_role;

-- 5) Profiles table
CREATE TABLE public.profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome text NOT NULL DEFAULT '',
  telefone text,
  cargo text,
  torre text,
  status text NOT NULL DEFAULT 'ativo',
  ultimo_acesso timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read own or admin all" ON public.profiles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR private.has_role(auth.uid(), 'admin'));
CREATE POLICY "Update own profile" ON public.profiles FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admin manage profiles" ON public.profiles FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin')) WITH CHECK (private.has_role(auth.uid(), 'admin'));

-- 6) updated_at trigger
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;
CREATE TRIGGER trg_profiles_touch BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 7) Signup handler: create profile + default role (no auto-admin)
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (user_id, nome, telefone, cargo, torre)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', NEW.email),
    NEW.raw_user_meta_data->>'telefone',
    NEW.raw_user_meta_data->>'cargo',
    NEW.raw_user_meta_data->>'torre'
  ) ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id,
    COALESCE(
      NULLIF(NEW.raw_user_meta_data->>'perfil','')::public.app_role,
      'sindico'::public.app_role
    )
  ) ON CONFLICT DO NOTHING;
  RETURN NEW;
END $$;

-- Ensure trigger is attached (idempotent)
DROP TRIGGER IF EXISTS on_auth_user_created_role ON auth.users;
CREATE TRIGGER on_auth_user_created_role
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_role();

-- 8) Backfill profiles for existing users
INSERT INTO public.profiles (user_id, nome)
SELECT id, COALESCE(raw_user_meta_data->>'nome', email)
FROM auth.users
ON CONFLICT DO NOTHING;

-- 9) Manutencoes RLS: admin full, sindico no delete, subsindico scoped by torre
CREATE POLICY "manutencoes view" ON public.manutencoes FOR SELECT TO authenticated USING (
  private.has_any_role(auth.uid(), ARRAY['admin','sindico']::public.app_role[])
  OR (
    private.has_role(auth.uid(),'subsindico')
    AND (
      local_manutencao = 'Geral'
      OR torre = (SELECT torre FROM public.profiles WHERE user_id = auth.uid())
    )
  )
);
CREATE POLICY "manutencoes insert" ON public.manutencoes FOR INSERT TO authenticated WITH CHECK (
  private.has_any_role(auth.uid(), ARRAY['admin','sindico']::public.app_role[])
  OR (
    private.has_role(auth.uid(),'subsindico')
    AND (
      local_manutencao = 'Geral'
      OR torre = (SELECT torre FROM public.profiles WHERE user_id = auth.uid())
    )
  )
);
CREATE POLICY "manutencoes update" ON public.manutencoes FOR UPDATE TO authenticated
USING (
  private.has_any_role(auth.uid(), ARRAY['admin','sindico']::public.app_role[])
  OR (
    private.has_role(auth.uid(),'subsindico')
    AND (
      local_manutencao = 'Geral'
      OR torre = (SELECT torre FROM public.profiles WHERE user_id = auth.uid())
    )
  )
) WITH CHECK (
  private.has_any_role(auth.uid(), ARRAY['admin','sindico']::public.app_role[])
  OR (
    private.has_role(auth.uid(),'subsindico')
    AND (
      local_manutencao = 'Geral'
      OR torre = (SELECT torre FROM public.profiles WHERE user_id = auth.uid())
    )
  )
);
CREATE POLICY "manutencoes delete" ON public.manutencoes FOR DELETE TO authenticated USING (
  private.has_role(auth.uid(),'admin')
);

-- 10) Recreate storage + realtime policies for the new role set
CREATE POLICY "Read manutencoes files" ON storage.objects FOR SELECT TO authenticated USING (
  bucket_id = 'manutencoes' AND private.has_any_role(auth.uid(), ARRAY['admin','sindico','subsindico']::public.app_role[])
);
CREATE POLICY "Insert manutencoes files" ON storage.objects FOR INSERT TO authenticated WITH CHECK (
  bucket_id = 'manutencoes' AND private.has_any_role(auth.uid(), ARRAY['admin','sindico','subsindico']::public.app_role[])
);
CREATE POLICY "Update manutencoes files" ON storage.objects FOR UPDATE TO authenticated USING (
  bucket_id = 'manutencoes' AND private.has_any_role(auth.uid(), ARRAY['admin','sindico','subsindico']::public.app_role[])
);
CREATE POLICY "Delete manutencoes files" ON storage.objects FOR DELETE TO authenticated USING (
  bucket_id = 'manutencoes' AND private.has_role(auth.uid(),'admin')
);

CREATE POLICY "Read realtime messages" ON realtime.messages FOR SELECT TO authenticated USING (
  private.has_any_role(auth.uid(), ARRAY['admin','sindico','subsindico']::public.app_role[])
);
