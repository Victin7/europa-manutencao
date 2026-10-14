
REVOKE EXECUTE ON FUNCTION public.validate_manutencao_local() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_numero_chamado() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_numero_os() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.manutencoes_before_update() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user_role() FROM PUBLIC, anon, authenticated;
