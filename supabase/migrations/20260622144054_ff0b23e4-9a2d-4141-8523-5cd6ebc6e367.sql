
-- Roles enum and table
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'user');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
CREATE POLICY "Users can view their own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Auto-promote first user to admin; subsequent users get 'user'
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS on_auth_user_created_role ON auth.users;
CREATE TRIGGER on_auth_user_created_role
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_role();

-- Backfill: make existing users admins (no admin yet at this point)
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin' FROM auth.users
ON CONFLICT DO NOTHING;

-- Replace permissive manutencoes policies
DROP POLICY IF EXISTS "Authenticated can insert manutencoes" ON public.manutencoes;
DROP POLICY IF EXISTS "Authenticated can update manutencoes" ON public.manutencoes;
DROP POLICY IF EXISTS "Authenticated can delete manutencoes" ON public.manutencoes;

CREATE POLICY "Admins can insert manutencoes" ON public.manutencoes
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update manutencoes" ON public.manutencoes
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete manutencoes" ON public.manutencoes
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Storage policies for manutencoes bucket
DROP POLICY IF EXISTS "Authenticated insert manutencoes files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated update manutencoes files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated delete manutencoes files" ON storage.objects;

CREATE POLICY "Admins insert manutencoes files" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'manutencoes' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update manutencoes files" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'manutencoes' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete manutencoes files" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'manutencoes' AND public.has_role(auth.uid(), 'admin'));
