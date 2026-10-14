
CREATE OR REPLACE FUNCTION public.verify_pin_proxy(_user_id uuid, _pin text)
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = public, extensions, private AS $$
  SELECT private.verify_pin(_user_id, _pin);
$$;
REVOKE ALL ON FUNCTION public.verify_pin_proxy(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.verify_pin_proxy(uuid, text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_pin_proxy(uuid, text) TO service_role;

CREATE OR REPLACE FUNCTION public.set_pin_proxy(_user_id uuid, _pin text)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public, extensions, private AS $$
  SELECT private.set_pin(_user_id, _pin);
$$;
REVOKE ALL ON FUNCTION public.set_pin_proxy(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_pin_proxy(uuid, text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_pin_proxy(uuid, text) TO service_role;
