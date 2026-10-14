
-- Revoke execute on internal trigger/helper functions from public roles
REVOKE EXECUTE ON FUNCTION public.set_numero_chamado() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.manutencoes_before_update() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user_role() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_numero_os() FROM PUBLIC, anon, authenticated;

-- has_role: keep executable by authenticated (needed by RLS policies) but not by anon
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

-- Realtime: restrict realtime.messages subscriptions to admins only
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read realtime messages" ON realtime.messages;
CREATE POLICY "Admins can read realtime messages"
ON realtime.messages
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
