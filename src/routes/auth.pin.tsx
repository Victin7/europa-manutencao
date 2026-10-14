import { createFileRoute, useNavigate, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Lock, LogOut } from "lucide-react";
import { toast } from "sonner";
import { getPinGateStatus, verifyPinAndComplete, clearPinSession } from "@/lib/pin.functions";
import europaLogo from "@/assets/europa-logo.png.asset.json";

export const Route = createFileRoute("/auth/pin")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
  },
  component: PinPage,
});

function PinPage() {
  const navigate = useNavigate();
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [length, setLength] = useState<4 | 5 | 6>(6);
  const status = useServerFn(getPinGateStatus);
  const verify = useServerFn(verifyPinAndComplete);
  const clear = useServerFn(clearPinSession);

  useEffect(() => {
    status().then((s: any) => {
      if (!s.requires_pin || s.verified) {
        navigate({ to: "/dashboard" });
      }
    }).catch(() => {});
  }, [navigate, status]);

  async function submit() {
    if (pin.length < 4) return;
    setLoading(true);
    try {
      await verify({ data: { pin } });
      toast.success("PIN validado com sucesso.");
      navigate({ to: "/dashboard" });
    } catch (e) {
      toast.error("PIN inválido. Tente novamente.");
      setPin("");
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    await clear().catch(() => {});
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  }

  return (
    <div className="min-h-screen grid place-items-center bg-background p-6">
      <Card className="w-full max-w-md p-8 space-y-6 border-gold/20">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="rounded-xl bg-primary p-3 shadow-md ring-1 ring-gold/30">
            <img src={europaLogo.url} alt="Europa" className="h-20 w-20 object-contain" />
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-gold">Condomínio Europa</div>
            <div className="font-display text-lg font-bold leading-tight">Europa Manutenção</div>
          </div>
        </div>
        <div className="space-y-1">
          <h2 className="font-display text-2xl flex items-center gap-2">
            <Lock className="h-5 w-5 text-gold" /> Validação de PIN
          </h2>
          <p className="text-sm text-muted-foreground">
            Informe seu PIN de segurança para concluir o acesso.
          </p>
        </div>

        <div className="space-y-3">
          <div className="flex gap-2 text-xs">
            {[4, 5, 6].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => { setLength(n as 4|5|6); setPin(""); }}
                className={`px-2 py-1 rounded border ${length === n ? "bg-primary text-primary-foreground border-primary" : "border-muted-foreground/20"}`}
              >
                {n} dígitos
              </button>
            ))}
          </div>
          <div className="flex justify-center">
            <InputOTP
              maxLength={length}
              value={pin}
              onChange={(v) => setPin(v.replace(/\D/g, ""))}
              autoFocus
            >
              <InputOTPGroup>
                {Array.from({ length }).map((_, i) => (
                  <InputOTPSlot key={i} index={i} />
                ))}
              </InputOTPGroup>
            </InputOTP>
          </div>
        </div>

        <Button
          onClick={submit}
          disabled={loading || pin.length < 4}
          className="w-full bg-primary hover:bg-primary/90"
        >
          {loading ? "Validando..." : "Confirmar PIN"}
        </Button>

        <button
          onClick={logout}
          className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 mx-auto"
        >
          <LogOut className="h-3 w-3" /> Cancelar e sair
        </button>

        <p className="text-[11px] text-muted-foreground text-center">
          Após 5 tentativas incorretas o acesso é bloqueado por 15 minutos.
          O PIN é definido pela administração.
        </p>
      </Card>
    </div>
  );
}
