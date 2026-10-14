import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCurrentProfile, useCurrentRole } from "@/hooks/use-role";
import { TORRES } from "@/lib/manutencoes";
import { changeOwnPin } from "@/lib/pin.functions";
import { toast } from "sonner";
import {
  User, Mail, Phone, Building2, ShieldCheck, Calendar, Clock, Lock,
  AtSign, Briefcase, Save, Eye, EyeOff, ShieldAlert, Bell, Settings,
  LogOut, LifeBuoy, ChevronRight, Camera, Home,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/perfil")({ component: PerfilPage });

const roleLabel: Record<string, string> = {
  admin: "Administração",
  sindico: "Síndico",
  subsindico: "Subsíndico",
  conselheiro: "Conselheiro",
};

function normalizeUsername(v: string) {
  return v.trim().toLowerCase().replace(/[^a-z0-9._-]/g, "");
}

function passwordStrength(pw: string): { label: string; score: number } {
  let s = 0;
  if (pw.length >= 8) s++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) s++;
  if (/\d/.test(pw)) s++;
  if (/[^\w\s]/.test(pw)) s++;
  const labels = ["Fraca", "Fraca", "Média", "Boa", "Forte"];
  return { label: labels[s], score: s };
}

function PerfilPage() {
  const qc = useQueryClient();
  const { data: profile, isLoading } = useCurrentProfile();
  const { data: role } = useCurrentRole();
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [nome, setNome] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [cargo, setCargo] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmaSenha, setConfirmaSenha] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showPw2, setShowPw2] = useState(false);
  const [pinAtual, setPinAtual] = useState("");
  const [novoPin, setNovoPin] = useState("");
  const [confirmaPin, setConfirmaPin] = useState("");
  const changePinFn = useServerFn(changeOwnPin);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? ""));
  }, []);
  useEffect(() => {
    if (profile) {
      setTelefone(profile.telefone ?? "");
      setNome(profile.nome ?? "");
      setDisplayName(profile.display_name ?? "");
      setCargo(profile.cargo ?? "");
    }
  }, [profile]);

  const savePersonal = useMutation({
    mutationFn: async () => {
      if (!profile) throw new Error("Perfil não carregado");
      const uname = normalizeUsername(displayName);
      if (!uname) throw new Error("Nome de Usuário inválido");
      const patch: any = { telefone: telefone || null, nome: nome || profile.nome };
      if (!profile.is_principal) patch.cargo = cargo || null;
      if (uname !== profile.display_name) patch.display_name = uname;
      const { error } = await supabase.from("profiles").update(patch).eq("user_id", profile.user_id);
      if (error) {
        if (error.code === "23505" || /duplicate|unique/i.test(error.message))
          throw new Error("Este Nome de Usuário já está em uso.");
        throw error;
      }
    },
    onSuccess: () => {
      toast.success("Alterações salvas.");
      qc.invalidateQueries({ queryKey: ["current-profile"] });
    },
    onError: () => toast.error("Não foi possível concluir a ação. Tente novamente."),
  });

  const savePassword = useMutation({
    mutationFn: async () => {
      if (novaSenha !== confirmaSenha) throw new Error("As senhas não coincidem");
      if (novaSenha.length < 8) throw new Error("Use pelo menos 8 caracteres");
      const { error } = await supabase.auth.updateUser({ password: novaSenha });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Senha alterada com sucesso.");
      setNovaSenha("");
      setConfirmaSenha("");
    },
    onError: () => toast.error("Não foi possível concluir a ação. Tente novamente."),
  });

  const changePin = useMutation({
    mutationFn: async () => {
      if (!/^[0-9]{4,6}$/.test(novoPin)) throw new Error("PIN deve ter 4 a 6 dígitos");
      if (novoPin !== confirmaPin) throw new Error("PINs não coincidem");
      await changePinFn({ data: { current_pin: pinAtual || undefined, new_pin: novoPin } });
    },
    onSuccess: () => {
      toast.success("PIN atualizado com sucesso.");
      setPinAtual(""); setNovoPin(""); setConfirmaPin("");
    },
    onError: () => toast.error("Não foi possível concluir a ação. Tente novamente."),
  });

  async function logout() {
    await supabase.auth.signOut();
    window.location.href = "/auth";
  }

  if (isLoading) return <div className="text-sm text-muted-foreground">Carregando...</div>;
  if (!profile) return <div className="text-sm text-muted-foreground">Perfil não encontrado.</div>;

  const torreNome = TORRES.find((t) => t.id === profile.torre)?.nome;
  const initial = (nome || displayName || email || "?").slice(0, 1).toUpperCase();
  const strength = passwordStrength(novaSenha);

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center justify-end gap-1 text-xs text-muted-foreground">
        <Link to="/dashboard" className="flex items-center gap-1 hover:text-primary">
          <Home className="h-3.5 w-3.5" /> Painel
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-primary font-medium">Meu Perfil</span>
      </nav>

      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="h-14 w-14 rounded-xl bg-gold/20 grid place-items-center shrink-0">
          <User className="h-7 w-7 text-gold" />
        </div>
        <div>
          <h1 className="font-display text-4xl leading-tight">Meu Perfil</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Visualize seus dados e altere-os sempre que precisar.
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr,320px] gap-6">
        {/* Coluna principal */}
        <div className="space-y-6 min-w-0">
          {/* Card avatar + resumo */}
          <Card className="overflow-hidden p-0">
            <div className="grid md:grid-cols-[240px,1fr]">
              <div className="bg-primary text-primary-foreground p-6 flex flex-col items-center justify-center gap-4">
                <div className="relative">
                  <div className="h-32 w-32 rounded-full border-4 border-gold grid place-items-center text-5xl font-display text-gold bg-primary">
                    {initial}
                  </div>
                </div>
                <Button size="sm" variant="outline" className="bg-transparent border-white/30 text-white hover:bg-white/10">
                  <Camera className="h-4 w-4" /> Alterar foto
                </Button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <div className="font-display text-2xl text-primary break-all">
                    @{profile.display_name}
                  </div>
                  <Badge variant="secondary" className="mt-2 bg-primary/10 text-primary border-primary/20">
                    {role ? roleLabel[role] : "—"}
                  </Badge>
                </div>
                <div className="grid sm:grid-cols-2 gap-4 pt-1 text-sm border-t border-border pt-4">
                  <Info icon={<Mail className="h-4 w-4" />} label="E-mail" value={email} />
                  <Info
                    icon={<ShieldCheck className="h-4 w-4" />}
                    label="Status da conta"
                    value={profile.status === "ativo" ? "Ativo" : "Inativo"}
                    valueClass={profile.status === "ativo" ? "text-success font-semibold" : ""}
                  />
                  <Info
                    icon={<Calendar className="h-4 w-4" />}
                    label="Cadastrado em"
                    value={new Date(profile.created_at).toLocaleString("pt-BR")}
                  />
                  <Info
                    icon={<Clock className="h-4 w-4" />}
                    label="Último acesso"
                    value={
                      profile.ultimo_acesso
                        ? new Date(profile.ultimo_acesso).toLocaleString("pt-BR")
                        : "—"
                    }
                  />
                </div>
              </div>
            </div>
          </Card>

          {/* Informações Pessoais */}
          <Card className="p-6 space-y-5">
            <SectionHeader
              icon={<User className="h-5 w-5" />}
              title="Informações Pessoais"
              subtitle="Atualize seu nome, contato e Nome de Usuário exibido no sistema."
            />
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nome" className="text-xs uppercase tracking-wide">Nome Completo</Label>
                <div className="relative">
                  <User className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input id="nome" className="pl-9" value={nome} onChange={(e) => setNome(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="uname" className="text-xs uppercase tracking-wide">Nome de Usuário</Label>
                <div className="relative">
                  <AtSign className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="uname"
                    className="pl-9"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value.toLowerCase())}
                    placeholder="ex: victor.silva"
                    maxLength={40}
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Único no sistema. Use letras, números, ponto, traço ou underline.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="cargo" className="text-xs uppercase tracking-wide">Cargo / Função</Label>
                <div className="relative">
                  <Briefcase className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="cargo"
                    className="pl-9"
                    value={cargo}
                    onChange={(e) => setCargo(e.target.value)}
                    disabled={!!profile.is_principal}
                    placeholder="ex: Gerente predial"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="tel" className="text-xs uppercase tracking-wide">Telefone</Label>
                <div className="relative">
                  <Phone className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="tel"
                    className="pl-9"
                    value={telefone}
                    onChange={(e) => setTelefone(e.target.value)}
                    placeholder="(00) 00000-0000"
                  />
                </div>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label className="text-xs uppercase tracking-wide">E-mail</Label>
                <div className="relative">
                  <Mail className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input className="pl-9 bg-muted/50" value={email} disabled />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  O e-mail é usado apenas para autenticação e notificações e não pode ser alterado aqui.
                </p>
              </div>
              {profile.torre && (
                <div className="space-y-2 sm:col-span-2">
                  <Label className="text-xs uppercase tracking-wide">Torre vinculada</Label>
                  <div className="relative">
                    <Building2 className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      className="pl-9 bg-muted/50"
                      value={`${profile.torre}${torreNome ? " - " + torreNome : ""}`}
                      disabled
                    />
                  </div>
                </div>
              )}
            </div>
            <Button
              onClick={() => savePersonal.mutate()}
              disabled={savePersonal.isPending}
              className="w-full bg-primary hover:bg-primary/90 h-11"
            >
              <Save className="h-4 w-4" /> Salvar alterações
            </Button>
          </Card>

          {/* Alterar senha */}
          <Card className="p-6 space-y-5">
            <SectionHeader
              icon={<Lock className="h-5 w-5" />}
              title="Alterar senha"
              subtitle="Digite uma nova senha segura para sua conta."
            />
            <div className="grid md:grid-cols-[1fr,260px] gap-6">
              <div className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="np" className="text-xs uppercase tracking-wide">Nova senha</Label>
                    <div className="relative">
                      <Input
                        id="np"
                        type={showPw ? "text" : "password"}
                        minLength={8}
                        value={novaSenha}
                        onChange={(e) => setNovaSenha(e.target.value)}
                        className="pr-9"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPw((v) => !v)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary"
                      >
                        {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cp" className="text-xs uppercase tracking-wide">Confirmar nova senha</Label>
                    <div className="relative">
                      <Input
                        id="cp"
                        type={showPw2 ? "text" : "password"}
                        minLength={8}
                        value={confirmaSenha}
                        onChange={(e) => setConfirmaSenha(e.target.value)}
                        className="pr-9"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPw2((v) => !v)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary"
                      >
                        {showPw2 ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </div>
                {novaSenha && (
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">
                      Força da senha: <span className="font-semibold text-primary">{strength.label}</span>
                    </div>
                    <div className="flex gap-1">
                      {[0, 1, 2, 3].map((i) => (
                        <div
                          key={i}
                          className={`h-1.5 flex-1 rounded-full ${
                            i < strength.score ? "bg-gold" : "bg-muted"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                )}
                <Button
                  onClick={() => savePassword.mutate()}
                  disabled={savePassword.isPending || !novaSenha}
                  className="bg-gold text-gold-foreground hover:bg-gold/90"
                >
                  <Lock className="h-4 w-4" /> Atualizar senha
                </Button>
              </div>
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-xs space-y-2 h-fit">
                <div className="flex items-center gap-2 font-semibold text-primary">
                  <ShieldCheck className="h-4 w-4" /> Dicas para uma senha segura
                </div>
                <ul className="space-y-1 text-muted-foreground">
                  <li>✓ Use pelo menos 8 caracteres</li>
                  <li>✓ Inclua letras maiúsculas e minúsculas</li>
                  <li>✓ Use números e símbolos</li>
                  <li>✓ Evite informações pessoais</li>
                </ul>
              </div>
            </div>
          </Card>

          {/* PIN */}
          {!profile.is_principal && (
            <Card className="p-6 space-y-5">
              <SectionHeader
                icon={<ShieldAlert className="h-5 w-5" />}
                title="Alterar PIN de segurança"
                subtitle="Entre 4 e 6 dígitos numéricos. Por segurança, o PIN atual não pode ser visualizado — apenas substituído."
              />
              <div className="grid sm:grid-cols-3 gap-3">
                <PinField id="pa" label="PIN atual" value={pinAtual} onChange={setPinAtual} />
                <PinField id="np2" label="Novo PIN" value={novoPin} onChange={setNovoPin} />
                <PinField id="cp2" label="Confirmar novo PIN" value={confirmaPin} onChange={setConfirmaPin} />
              </div>
              <Button
                onClick={() => changePin.mutate()}
                disabled={changePin.isPending || !novoPin}
                className="bg-primary hover:bg-primary/90"
              >
                <Lock className="h-4 w-4" /> Atualizar PIN
              </Button>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <aside className="space-y-4">
          <Card className="p-6 bg-primary text-primary-foreground border-primary relative overflow-hidden">
            <div className="h-10 w-10 rounded-lg bg-gold/20 grid place-items-center mb-4">
              <Lock className="h-5 w-5 text-gold" />
            </div>
            <h3 className="font-display text-xl leading-snug">Sua segurança é nossa prioridade!</h3>
            <p className="text-sm text-primary-foreground/80 mt-2">
              Mantenha seus dados sempre atualizados para garantir a segurança da sua conta.
            </p>
          </Card>

          <Card className="p-2">
            <div className="px-3 py-2 font-display text-base">Acesso rápido</div>
            <QuickLink to="/logs" icon={<Clock className="h-4 w-4" />} label="Logs de acesso" />
            <QuickLink to="/dashboard" icon={<Bell className="h-4 w-4" />} label="Notificações" />
            <QuickLink to="/dashboard" icon={<Settings className="h-4 w-4" />} label="Configurações" />
            <button
              onClick={logout}
              className="w-full flex items-center justify-between gap-3 rounded-md px-3 py-2.5 text-sm text-destructive hover:bg-destructive/10 transition-colors"
            >
              <span className="flex items-center gap-2">
                <LogOut className="h-4 w-4" /> Sair da conta
              </span>
              <ChevronRight className="h-4 w-4" />
            </button>
          </Card>

          <Card className="p-5 bg-gold/10 border-gold/30">
            <div className="font-display text-base">Precisa de ajuda?</div>
            <p className="text-xs text-muted-foreground mt-1">
              Em caso de dúvidas ou problemas, entre em contato com o suporte.
            </p>
            <Button variant="outline" className="w-full mt-3 border-gold/50 text-primary hover:bg-gold hover:text-gold-foreground">
              <LifeBuoy className="h-4 w-4" /> Abrir chamado
            </Button>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function SectionHeader({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="h-10 w-10 rounded-lg bg-gold/15 text-gold grid place-items-center shrink-0">
        {icon}
      </div>
      <div>
        <h2 className="font-display text-xl leading-tight">{title}</h2>
        <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
      </div>
    </div>
  );
}

function Info({
  icon, label, value, valueClass,
}: { icon: React.ReactNode; label: string; value: string; valueClass?: string }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground flex items-center gap-1">
        {icon} {label}
      </div>
      <div className={`mt-1 font-medium break-all ${valueClass ?? ""}`}>{value}</div>
    </div>
  );
}

function QuickLink({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      to={to}
      className="w-full flex items-center justify-between gap-3 rounded-md px-3 py-2.5 text-sm hover:bg-muted transition-colors"
    >
      <span className="flex items-center gap-2 text-primary">
        {icon} {label}
      </span>
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    </Link>
  );
}

function PinField({ id, label, value, onChange }: { id: string; label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-xs uppercase tracking-wide">{label}</Label>
      <Input
        id={id}
        inputMode="numeric"
        maxLength={6}
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, ""))}
        className="tracking-widest text-center"
      />
    </div>
  );
}
