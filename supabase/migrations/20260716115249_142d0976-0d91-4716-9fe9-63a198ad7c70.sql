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

  INSERT INTO public.profiles (user_id, nome, telefone, cargo, torre, display_name, status)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', NEW.email),
    NEW.raw_user_meta_data->>'telefone',
    NEW.raw_user_meta_data->>'cargo',
    NEW.raw_user_meta_data->>'torre',
    final_username,
    'pendente'
  ) ON CONFLICT (user_id) DO NOTHING;

  -- Do NOT auto-assign any role. New users have no role until an admin approves and grants one.
  -- This prevents self-registered accounts from getting any read access to maintenance data.
  RETURN NEW;
END $function$;