import { createFileRoute, redirect } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  adminCreateUser,
  adminListUsers,
  adminUpdateUser,
  adminResetPassword,
  adminDeleteUser,
  adminSetUserStatus,
} from "@/lib/users.functions";
import { adminResetPin, adminUnlockPin } from "@/lib/pin.functions";
import { Card } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Users } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { TableSkeleton } from "@/components/TableSkeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { TORRES } from "@/lib/manutencoes";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Pencil, KeyRound, Lock, Unlock, Copy, Mail, MessageCircle, Trash2, Power, PowerOff } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_authenticated/usuarios")({
  beforeLoad: async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw redirect({ to: "/auth" });
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!data) throw redirect({ to: "/dashboard" });
  },
  component: UsuariosPage,
});

const ROLES = [
  { value: "admin", label: "Administração" },
  { value: "sindico", label: "Síndico" },
  { value: "subsindico", label: "Subsíndico" },
  { value: "conselheiro", label: "Conselheiro" },
] as const;

type Perfil = typeof ROLES[number]["value"];

function UsuariosPage() {
  const list = useServerFn(adminListUsers);
  const create = useServerFn(adminCreateUser);
  const update = useServerFn(adminUpdateUser);
  const resetPwd = useServerFn(adminResetPassword);
  const resetPin = useServerFn(adminResetPin);
  const unlockPin = useServerFn(adminUnlockPin);
  const deleteUser = useServerFn(adminDeleteUser);
  const setStatus = useServerFn(adminSetUserStatus);
  const qc = useQueryClient();

  const [shareData, setShareData] = useState<null | {
    nome: string; cargo: string; torre: string; email: string; senha: string; pin: string;
  }>(null);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => list(),
  });

  const createMut = useMutation({
    mutationFn: (data: Parameters<typeof create>[0]["data"]) => create({ data }),
    onSuccess: () => {
      toast.success("Usuário criado com sucesso.");
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: () => toast.error("Não foi possível concluir a ação. Tente novamente."),
  });

  const updateMut = useMutation({
    mutationFn: (data: Parameters<typeof update>[0]["data"]) => update({ data }),
    onSuccess: () => { toast.success("Alterações salvas."); qc.invalidateQueries({ queryKey: ["admin-users"] }); },
    onError: () => toast.error("Não foi possível concluir a ação. Tente novamente."),
  });

  const pwdMut = useMutation({
    mutationFn: (data: Parameters<typeof resetPwd>[0]["data"]) => resetPwd({ data }),
    onSuccess: () => toast.success("Senha redefinida com sucesso."),
    onError: () => toast.error("Não foi possível concluir a ação. Tente novamente."),
  });
  const pinMut = useMutation({
    mutationFn: (data: Parameters<typeof resetPin>[0]["data"]) => resetPin({ data }),
    onSuccess: () => toast.success("PIN redefinido com sucesso."),
    onError: () => toast.error("Não foi possível concluir a ação. Tente novamente."),
  });
  const unlockMut = useMutation({
    mutationFn: (data: Parameters<typeof unlockPin>[0]["data"]) => unlockPin({ data }),
    onSuccess: () => { toast.success("Usuário desbloqueado com sucesso."); qc.invalidateQueries({ queryKey: ["admin-users"] }); },
    onError: () => toast.error("Não foi possível concluir a ação. Tente novamente."),
  });
  const deleteMut = useMutation({
    mutationFn: (data: { user_id: string }) => deleteUser({ data }),
    onSuccess: () => { toast.success("Perfil excluído com sucesso."); qc.invalidateQueries({ queryKey: ["admin-users"] }); },
    onError: () => toast.error("Não foi possível concluir a ação. Tente novamente."),
  });
  const statusMut = useMutation({
    mutationFn: (data: { user_id: string; status: "ativo" | "inativo" | "pendente" }) => setStatus({ data }),
    onSuccess: (_d, v) => {
      toast.success(v.status === "ativo" ? "Usuário ativado" : "Usuário desativado");
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: () => toast.error("Não foi possível concluir a ação. Tente novamente."),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-gold">Administração</div>
          <h1 className="font-display text-3xl font-bold text-primary">Gerenciar Usuários</h1>
          <p className="text-sm text-muted-foreground">
            Crie, edite e controle quem tem acesso ao Europa Manutenção.
          </p>
        </div>
        <CreateUserDialog
          pending={createMut.isPending}
          onCreate={async (d) => {
            await createMut.mutateAsync({
              email: d.email, password: d.password, pin: d.pin,
              nome: d.nome, display_name: d.display_name || undefined,
              telefone: d.telefone, cargo: d.cargo,
              perfil: d.perfil, torre: d.torre || null,
            });
            const torreNome = TORRES.find((t) => t.id === d.torre)?.nome;
            setShareData({
              nome: d.nome,
              cargo: ROLES.find((r) => r.value === d.perfil)?.label ?? d.perfil,
              torre: d.torre ? `${d.torre}${torreNome ? " - " + torreNome : ""}` : "—",
              email: d.email,
              senha: d.password,
              pin: d.pin,
            });
          }}
        />
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-primary text-primary-foreground text-left text-xs uppercase tracking-wider">
              <tr>
                <th className="p-3">Nome</th>
                <th className="p-3">Nome de Usuário</th>
                <th className="p-3">E-mail</th>
                <th className="p-3">Perfil</th>
                <th className="p-3">Torre</th>
                <th className="p-3">Status</th>
                <th className="p-3">PIN</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading && (
                <tr><td colSpan={8} className="p-0"><TableSkeleton rows={4} cols={6} /></td></tr>
              )}
              {!isLoading && users.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-0">
                    <EmptyState
                      icon={Users}
                      title="Nenhum usuário cadastrado"
                      description="Adicione membros da equipe para que possam acessar o sistema."
                    />
                  </td>
                </tr>
              )}

              {users.map((u: any) => {
                const locked = u.pin_locked_until && new Date(u.pin_locked_until) > new Date();
                return (
                  <tr key={u.user_id} className="hover:bg-muted/40 transition-colors">
                    <td className="p-3 font-medium">
                      {u.nome || "—"}
                      {u.is_principal && <Badge className="ml-2 bg-gold text-gold-foreground">Principal</Badge>}
                    </td>
                    <td className="p-3">
                      <span className="font-mono text-xs text-primary">@{u.display_name || "—"}</span>
                    </td>
                    <td className="p-3 text-xs text-muted-foreground">{u.email}</td>
                    <td className="p-3">
                      <Badge variant="secondary">
                        {ROLES.find((r) => r.value === u.perfil)?.label ?? u.perfil}
                      </Badge>
                    </td>
                    <td className="p-3">{u.torre || "—"}</td>
                    <td className="p-3">
                      <Badge variant={u.status === "ativo" ? "default" : "outline"}>
                        {u.status === "ativo" ? "Ativo" : "Inativo"}
                      </Badge>
                    </td>
                    <td className="p-3">
                      {u.is_principal ? (
                        <Badge variant="outline">N/D</Badge>
                      ) : locked ? (
                        <Badge variant="destructive">Bloqueado</Badge>
                      ) : u.pin_hash ? (
                        <Badge variant="secondary">Configurado</Badge>
                      ) : (
                        <Badge variant="outline">Sem PIN</Badge>
                      )}
                    </td>
                    <td className="p-3 flex gap-1 flex-wrap">
                      <EditUserDialog
                        user={u}
                        onSave={(d) => updateMut.mutate({ user_id: u.user_id, ...d })}
                        pending={updateMut.isPending}
                      />
                      <ResetPasswordDialog
                        userId={u.user_id}
                        onSave={(pw) => pwdMut.mutate({ user_id: u.user_id, password: pw })}
                        pending={pwdMut.isPending}
                      />
                      {!u.is_principal && (
                        <ResetPinDialog
                          userId={u.user_id}
                          onSave={(pin) => pinMut.mutate({ user_id: u.user_id, pin })}
                          pending={pinMut.isPending}
                        />
                      )}
                      {locked && (
                        <TooltipProvider delayDuration={200}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost" size="sm"
                                onClick={() => unlockMut.mutate({ user_id: u.user_id })}
                              >
                                <Unlock className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Desbloquear PIN</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                      {!u.is_principal && (
                        <TooltipProvider delayDuration={200}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost" size="sm"
                                onClick={() => statusMut.mutate({
                                  user_id: u.user_id,
                                  status: u.status === "ativo" ? "inativo" : "ativo",
                                })}
                              >
                                {u.status === "ativo" ? <PowerOff className="h-4 w-4 text-warning" /> : <Power className="h-4 w-4 text-success" />}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>{u.status === "ativo" ? "Desativar usuário" : "Ativar usuário"}</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                      {!u.is_principal && (
                        <AlertDialog>
                          <TooltipProvider delayDuration={200}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </AlertDialogTrigger>
                              </TooltipTrigger>
                              <TooltipContent>Excluir perfil</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Excluir perfil?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza que deseja excluir <b>{u.nome || u.email}</b>? Esta ação removerá permanentemente o perfil e não poderá ser desfeita.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-destructive hover:bg-destructive/90"
                                onClick={() => deleteMut.mutate({ user_id: u.user_id })}
                              >
                                Confirmar Exclusão
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}

                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <ShareCredentialsDialog
        data={shareData}
        onClose={() => setShareData(null)}
      />
    </div>
  );
}

function CreateUserDialog({
  onCreate, pending,
}: {
  onCreate: (d: {
    nome: string; display_name: string; email: string; password: string; pin: string;
    telefone: string; cargo: string; perfil: Perfil; torre: string;
  }) => void | Promise<void>;
  pending: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    nome: "", display_name: "", email: "", password: "", pin: "",
    telefone: "", cargo: "",
    perfil: "sindico" as Perfil,
    torre: "" as string,
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!/^[0-9]{4,6}$/.test(form.pin)) {
      toast.error("PIN deve ter 4 a 6 dígitos numéricos.");
      return;
    }
    await onCreate({ ...form });
    setOpen(false);
    setForm({ nome: "", display_name: "", email: "", password: "", pin: "", telefone: "", cargo: "", perfil: "sindico", torre: "" });
  }

  const needsTorre = form.perfil === "subsindico" || form.perfil === "conselheiro";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-primary hover:bg-primary/90">
          <Plus className="h-4 w-4" /> Novo usuário
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Criar novo usuário</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <Field label="Nome completo">
            <Input required value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
          </Field>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Nome de Usuário (opcional)">
              <Input
                value={form.display_name}
                placeholder="Deixe em branco para gerar do e-mail"
                onChange={(e) => setForm({ ...form, display_name: e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, "") })}
              />
            </Field>
            <Field label="E-mail">
              <Input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </Field>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Senha inicial">
              <Input required type="text" minLength={6} value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </Field>
            <Field label="PIN inicial (4 a 6 dígitos)">
              <Input required inputMode="numeric" pattern="[0-9]{4,6}" maxLength={6}
                value={form.pin}
                onChange={(e) => setForm({ ...form, pin: e.target.value.replace(/\D/g, "") })} />
            </Field>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Telefone">
              <Input value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} />
            </Field>
            <Field label="Cargo">
              <Input value={form.cargo} onChange={(e) => setForm({ ...form, cargo: e.target.value })} />
            </Field>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Perfil de acesso">
              <Select value={form.perfil} onValueChange={(v) => setForm({ ...form, perfil: v as Perfil })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            {needsTorre && (
              <Field label="Torre vinculada">
                <Select value={form.torre} onValueChange={(v) => setForm({ ...form, torre: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {TORRES.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.id} - {t.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            )}
          </div>
          <DialogFooter>
            <Button type="submit" disabled={pending} className="bg-primary hover:bg-primary/90">
              {pending ? "Criando..." : "Criar usuário"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditUserDialog({
  user, onSave, pending,
}: { user: any; onSave: (d: any) => void; pending: boolean }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    nome: user.nome || "",
    display_name: user.display_name || "",
    telefone: user.telefone || "",
    cargo: user.cargo || "",
    torre: user.torre || "",
    perfil: user.perfil as Perfil,
    status: user.status,
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const needsTorre = form.perfil === "subsindico" || form.perfil === "conselheiro";
    onSave({
      nome: form.nome,
      display_name: form.display_name,
      telefone: form.telefone || null,
      cargo: form.cargo || null,
      torre: needsTorre ? (form.torre || null) : null,
      perfil: form.perfil,
      status: form.status,
    });
    setOpen(false);
  }

  const needsTorre = form.perfil === "subsindico" || form.perfil === "conselheiro";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" title="Editar"><Pencil className="h-4 w-4" /></Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Editar usuário</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <Field label="Nome"><Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></Field>
          <Field label="Nome de Usuário">
            <Input
              value={form.display_name}
              onChange={(e) => setForm({ ...form, display_name: e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, "") })}
            />
          </Field>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Telefone"><Input value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} /></Field>
            <Field label="Cargo"><Input value={form.cargo} onChange={(e) => setForm({ ...form, cargo: e.target.value })} /></Field>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Perfil">
              <Select value={form.perfil} onValueChange={(v) => setForm({ ...form, perfil: v as Perfil })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Status">
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="inativo">Inativo</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>
          {needsTorre && (
            <Field label="Torre vinculada">
              <Select value={form.torre} onValueChange={(v) => setForm({ ...form, torre: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {TORRES.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.id} - {t.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}
          <DialogFooter>
            <Button type="submit" disabled={pending} className="bg-primary hover:bg-primary/90">
              {pending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ResetPasswordDialog({ userId, onSave, pending }: { userId: string; onSave: (pw: string) => void; pending: boolean }) {
  const [open, setOpen] = useState(false);
  const [pw, setPw] = useState("");
  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setPw(""); }}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" title="Redefinir senha"><KeyRound className="h-4 w-4" /></Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Redefinir senha</DialogTitle></DialogHeader>
        <form
          onSubmit={(e) => { e.preventDefault(); onSave(pw); setOpen(false); setPw(""); }}
          className="space-y-3"
        >
          <Field label="Nova senha (mín. 6)">
            <Input required type="text" minLength={6} value={pw} onChange={(e) => setPw(e.target.value)} />
          </Field>
          <DialogFooter>
            <Button type="submit" disabled={pending} className="bg-primary hover:bg-primary/90">Salvar</Button>
          </DialogFooter>
          <p className="text-[11px] text-muted-foreground">
            ID: <span className="font-mono">{userId.slice(0, 8)}</span>
          </p>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ResetPinDialog({ userId, onSave, pending }: { userId: string; onSave: (pin: string) => void; pending: boolean }) {
  const [open, setOpen] = useState(false);
  const [pin, setPin] = useState("");
  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setPin(""); }}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" title="Redefinir PIN"><Lock className="h-4 w-4" /></Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Redefinir PIN</DialogTitle></DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!/^[0-9]{4,6}$/.test(pin)) { toast.error("PIN inválido"); return; }
            onSave(pin); setOpen(false); setPin("");
          }}
          className="space-y-3"
        >
          <Field label="Novo PIN (4 a 6 dígitos)">
            <Input required inputMode="numeric" pattern="[0-9]{4,6}" maxLength={6}
              value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))} />
          </Field>
          <DialogFooter>
            <Button type="submit" disabled={pending} className="bg-primary hover:bg-primary/90">Salvar</Button>
          </DialogFooter>
          <p className="text-[11px] text-muted-foreground">
            ID: <span className="font-mono">{userId.slice(0, 8)}</span>
          </p>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ShareCredentialsDialog({
  data, onClose,
}: { data: null | { nome: string; cargo: string; torre: string; email: string; senha: string; pin: string }; onClose: () => void }) {
  if (!data) return null;
  const text =
    `*Acesso Europa Manutenção*\n\n` +
    `Nome: ${data.nome}\n` +
    `Cargo: ${data.cargo}\n` +
    `Torre: ${data.torre}\n` +
    `E-mail: ${data.email}\n` +
    `Senha: ${data.senha}\n` +
    `PIN: ${data.pin}\n\n` +
    `Acesse: ${typeof window !== "undefined" ? window.location.origin : ""}/auth`;

  async function copy() {
    try { await navigator.clipboard.writeText(text); toast.success("Dados copiados."); }
    catch { toast.error("Não foi possível copiar"); }
  }

  const wa = `https://wa.me/?text=${encodeURIComponent(text)}`;
  const mail = `mailto:${encodeURIComponent(data.email)}?subject=${encodeURIComponent("Acesso Europa Manutenção")}&body=${encodeURIComponent(text)}`;

  return (
    <Dialog open={!!data} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>📋 Dados de acesso gerados</DialogTitle></DialogHeader>
        <div className="space-y-2 text-sm">
          <Row k="Nome" v={data.nome} />
          <Row k="Cargo" v={data.cargo} />
          <Row k="Torre" v={data.torre} />
          <Row k="E-mail" v={data.email} />
          <Row k="Senha" v={data.senha} mono />
          <Row k="PIN" v={data.pin} mono highlight />
        </div>
        <p className="text-[11px] text-muted-foreground">
          Esta é a única vez que o PIN será exibido. Encaminhe os dados ao usuário pelo canal seguro de sua preferência.
        </p>
        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button onClick={copy} className="bg-primary hover:bg-primary/90 w-full sm:w-auto">
            <Copy className="h-4 w-4" /> Copiar Dados de Acesso
          </Button>
          <a href={wa} target="_blank" rel="noreferrer" className="w-full sm:w-auto">
            <Button type="button" variant="outline" className="w-full"><MessageCircle className="h-4 w-4" /> WhatsApp</Button>
          </a>
          <a href={mail} className="w-full sm:w-auto">
            <Button type="button" variant="outline" className="w-full"><Mail className="h-4 w-4" /> E-mail</Button>
          </a>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Row({ k, v, mono, highlight }: { k: string; v: string; mono?: boolean; highlight?: boolean }) {
  return (
    <div className="flex justify-between gap-3 border-b py-1.5">
      <span className="text-muted-foreground">{k}</span>
      <span className={`${mono ? "font-mono" : ""} ${highlight ? "text-gold font-bold" : ""}`}>{v}</span>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}
