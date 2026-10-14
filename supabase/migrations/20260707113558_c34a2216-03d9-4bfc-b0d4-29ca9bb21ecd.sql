
-- 1) Secure default role on signup: ignore client-supplied role, default to conselheiro
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
  VALUES (NEW.id, 'conselheiro'::public.app_role)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END $function$;

-- 2) Restrict prestadores SELECT
DROP POLICY IF EXISTS "prestadores view auth" ON public.prestadores;
CREATE POLICY "prestadores view manage"
  ON public.prestadores FOR SELECT TO authenticated
  USING (private.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'sindico'::app_role, 'subsindico'::app_role]));

-- 3) Restrict prestador_avaliacoes SELECT
DROP POLICY IF EXISTS "avaliacoes view auth" ON public.prestador_avaliacoes;
CREATE POLICY "avaliacoes view manage"
  ON public.prestador_avaliacoes FOR SELECT TO authenticated
  USING (private.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'sindico'::app_role, 'subsindico'::app_role]));

-- 4) Scope avaliacoes UPDATE to admin or the original author
DROP POLICY IF EXISTS "avaliacoes update manage" ON public.prestador_avaliacoes;
CREATE POLICY "avaliacoes update scoped"
  ON public.prestador_avaliacoes FOR UPDATE TO authenticated
  USING (
    private.has_role(auth.uid(), 'admin'::app_role)
    OR (avaliado_por = auth.uid()
        AND private.has_any_role(auth.uid(), ARRAY['sindico'::app_role, 'subsindico'::app_role]))
  )
  WITH CHECK (
    private.has_role(auth.uid(), 'admin'::app_role)
    OR (avaliado_por = auth.uid()
        AND private.has_any_role(auth.uid(), ARRAY['sindico'::app_role, 'subsindico'::app_role]))
  );

-- 5) Prestadores storage: require privileged role
DROP POLICY IF EXISTS "prestadores storage read" ON storage.objects;
DROP POLICY IF EXISTS "prestadores storage insert" ON storage.objects;
DROP POLICY IF EXISTS "prestadores storage update" ON storage.objects;
DROP POLICY IF EXISTS "prestadores storage delete" ON storage.objects;

CREATE POLICY "prestadores storage read"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'prestadores' AND private.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'sindico'::app_role, 'subsindico'::app_role]));

CREATE POLICY "prestadores storage insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'prestadores' AND private.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'sindico'::app_role, 'subsindico'::app_role]));

CREATE POLICY "prestadores storage update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'prestadores' AND private.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'sindico'::app_role, 'subsindico'::app_role]))
  WITH CHECK (bucket_id = 'prestadores' AND private.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'sindico'::app_role, 'subsindico'::app_role]));

CREATE POLICY "prestadores storage delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'prestadores' AND private.has_role(auth.uid(), 'admin'::app_role));
