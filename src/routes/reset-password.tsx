import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import europaLogo from "@/assets/europa-logo.png.asset.json";

export const Route = createFileRoute("/reset-password")({ component: ResetPasswordPage });

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Supabase fires PASSWORD_RECOVERY when the user lands here from the email link.
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    // Also accept an already-active session
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      toast.error("As senhas não coincidem.");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Senha atualizada. Você já pode entrar.");
      await supabase.auth.signOut();
      navigate({ to: "/auth" });
    } catch (err) {
      toast.error("Não foi possível atualizar a senha. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid place-items-center bg-background p-6">
      <Card className="w-full max-w-md p-8 space-y-6 border-gold/20">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="rounded-xl bg-primary p-3 shadow-md ring-1 ring-gold/30">
            <img src={europaLogo.url} alt="Europa" className="h-20 w-20 object-contain" />
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-gold">
              Condomínio Europa
            </div>
            <div className="font-display text-lg font-bold leading-tight">Redefinir senha</div>
          </div>
        </div>

        {!ready ? (
          <p className="text-sm text-muted-foreground">
            Validando link de redefinição... Se nada acontecer, abra novamente o link enviado
            ao seu e-mail.
          </p>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pw">Nova senha</Label>
              <Input
                id="pw"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pw2">Confirmar nova senha</Label>
              <Input
                id="pw2"
                type="password"
                required
                minLength={6}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </div>
            <Button type="submit" disabled={loading} className="w-full bg-primary hover:bg-primary/90">
              {loading ? "Salvando..." : "Atualizar senha"}
            </Button>
          </form>
        )}
      </Card>
    </div>
  );
}
