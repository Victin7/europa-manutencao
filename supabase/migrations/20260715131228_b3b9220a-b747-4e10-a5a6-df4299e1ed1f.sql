
-- Add display_name (username) to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS display_name text;

-- Backfill from auth.users email (part before @) or from nome
UPDATE public.profiles p
SET display_name = COALESCE(
  NULLIF(regexp_replace(lower(split_part(u.email, '@', 1)), '[^a-z0-9._-]', '', 'g'), ''),
  'user_' || substr(p.user_id::text, 1, 8)
)
FROM auth.users u
WHERE u.id = p.user_id AND (p.display_name IS NULL OR p.display_name = '');

-- Ensure uniqueness / non-null going forward
UPDATE public.profiles SET display_name = 'user_' || substr(user_id::text, 1, 8) WHERE display_name IS NULL OR display_name = '';

-- Handle duplicates by appending suffix
WITH d AS (
  SELECT user_id, display_name,
    row_number() OVER (PARTITION BY lower(display_name) ORDER BY created_at) AS rn
  FROM public.profiles
)
UPDATE public.profiles p
SET display_name = p.display_name || '_' || substr(p.user_id::text, 1, 4)
FROM d
WHERE d.user_id = p.user_id AND d.rn > 1;

ALTER TABLE public.profiles ALTER COLUMN display_name SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS profiles_display_name_lower_idx ON public.profiles (lower(display_name));

-- Update signup trigger to auto-populate display_name from email prefix
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  base_username text;
  final_username text;
  suffix int := 0;
BEGIN
  base_username := COALESCE(
    NULLIF(regexp_replace(lower(split_part(NEW.email, '@', 1)), '[^a-z0-9._-]', '', 'g'), ''),
    'user_' || substr(NEW.id::text, 1, 8)
  );
  final_username := base_username;
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE lower(display_name) = lower(final_username)) LOOP
    suffix := suffix + 1;
    final_username := base_username || suffix::text;
  END LOOP;

  INSERT INTO public.profiles (user_id, nome, telefone, cargo, torre, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', NEW.email),
    NEW.raw_user_meta_data->>'telefone',
    NEW.raw_user_meta_data->>'cargo',
    NEW.raw_user_meta_data->>'torre',
    final_username
  ) ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'conselheiro'::public.app_role)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END $function$;
