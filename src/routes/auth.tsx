import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Building2, KeyRound, ArrowLeft } from "lucide-react";
import { getPinGateStatus } from "@/lib/pin.functions";
import europaLogo from "@/assets/europa-logo.png.asset.json";

export const Route = createFileRoute("/auth")({ component: AuthPage });

type Mode = "login" | "forgot";

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const pinStatus = useServerFn(getPinGateStatus);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) return;
      try {
        const s: any = await pinStatus();
        if (s.requires_pin && !s.verified) navigate({ to: "/auth/pin" });
        else navigate({ to: "/dashboard" });
      } catch {
        navigate({ to: "/dashboard" });
      }
    });
  }, [navigate, pinStatus]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      const { data: userData } = await supabase.auth.getUser();
      if (userData.user) {
        await supabase
          .from("profiles")
          .update({ ultimo_acesso: new Date().toISOString() })
          .eq("user_id", userData.user.id);
      }
      const s: any = await pinStatus().catch(() => ({ requires_pin: false, verified: true }));
      if (s.requires_pin && !s.verified) {
        toast.success("Senha aceita. Informe seu PIN.");
        navigate({ to: "/auth/pin" });
      } else {
        toast.success("Bem-vindo!");
        navigate({ to: "/dashboard" });
      }
    } catch (err) {
      toast.error("Não foi possível entrar. Verifique seus dados e tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast.success("Enviamos um link para o seu e-mail.");
      setMode("login");
    } catch (err) {
      toast.error("Não foi possível entrar. Verifique seus dados e tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      {/* Brand side */}
      <div className="hidden lg:flex flex-col justify-between bg-primary text-primary-foreground p-12 relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, var(--gold) 0%, transparent 40%), radial-gradient(circle at 80% 80%, var(--gold) 0%, transparent 50%)",
          }}
        />
        <div className="relative flex items-center gap-4">
          <div className="rounded-xl bg-white p-2 shadow-lg ring-1 ring-gold/30">
            <img
              src={europaLogo.url}
              alt="Condomínio Europa"
              className="h-20 w-20 object-contain"
            />
          </div>
          <div>
            <div className="text-xs uppercase tracking-[0.25em] text-gold">Condomínio Europa</div>
            <div className="font-display text-2xl font-bold">Europa Manutenção</div>
          </div>
        </div>
        <div className="relative space-y-4">
          <h1 className="font-display text-5xl font-bold leading-tight">
            Sistema Interno de{" "}
            <span className="text-gold">Gestão de Manutenção</span>
          </h1>
          <p className="text-primary-foreground/80 max-w-md">
            Ordens de serviço, históricos, relatórios e impressão pronta para o dia a dia da
            administração do condomínio.
          </p>
        </div>
        <div className="relative text-xs text-primary-foreground/60">© Condomínio Europa</div>
      </div>

      {/* Form side */}
      <div className="flex items-center justify-center p-6">
        <Card className="w-full max-w-md p-8 space-y-6 border-gold/20">
          <div className="lg:hidden flex flex-col items-center gap-3 text-center">
            <div className="rounded-xl bg-primary p-3 shadow-md ring-1 ring-gold/30">
              <img src={europaLogo.url} alt="Europa Manutenção" className="h-20 w-20 object-contain" />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-gold">
                Condomínio Europa
              </div>
              <div className="font-display text-lg font-bold leading-tight">Europa Manutenção</div>
              <div className="text-xs text-muted-foreground">Sistema Interno de Gestão</div>
            </div>
          </div>

          {mode === "login" ? (
            <>
              <div className="space-y-1">
                <h2 className="font-display text-3xl">Acessar sistema</h2>
                <p className="text-sm text-muted-foreground">
                  Sistema Interno de Gestão de Manutenção.
                </p>
              </div>
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="pw">Senha</Label>
                    <button
                      type="button"
                      onClick={() => setMode("forgot")}
                      className="text-xs text-primary hover:text-gold flex items-center gap-1"
                    >
                      <KeyRound className="h-3 w-3" /> Esqueci minha senha
                    </button>
                  </div>
                  <Input
                    id="pw"
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-primary hover:bg-primary/90"
                >
                  {loading ? "Aguarde..." : "Entrar"}
                </Button>
              </form>
              <p className="text-xs text-muted-foreground text-center">
                Cadastros são gerenciados pela administração.
              </p>
            </>
          ) : (
            <>
              <div className="space-y-1">
                <h2 className="font-display text-3xl">Recuperar senha</h2>
                <p className="text-sm text-muted-foreground">
                  Informe seu e-mail para receber o link de redefinição.
                </p>
              </div>
              <form onSubmit={handleForgot} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email-forgot">E-mail</Label>
                  <Input
                    id="email-forgot"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-primary hover:bg-primary/90"
                >
                  {loading ? "Enviando..." : "Enviar link de redefinição"}
                </Button>
                <button
                  type="button"
                  onClick={() => setMode("login")}
                  className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 mx-auto"
                >
                  <ArrowLeft className="h-3 w-3" /> Voltar ao login
                </button>
              </form>
            </>
          )}
        </Card>
      </div>

      {/* Hidden building icon import marker (keep tree-shake happy if reused later) */}
      <span className="hidden">
        <Building2 />
      </span>
    </div>
  );
}
