import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { adminListAccessLogs } from "@/lib/pin.functions";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { ShieldAlert } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { TableSkeleton } from "@/components/TableSkeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/logs")({
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
  component: LogsPage,
});

function traduzirEvento(evento: string): string {
  if (evento === "login_success") return "Login concluído";
  if (evento === "pin_success") return "PIN validado";
  if (evento === "pin_fail") return "Tentativa de PIN inválida";
  if (evento === "pin_locked" || evento === "pin_blocked") return "Conta bloqueada por PIN";
  if (evento?.startsWith("delete_user")) return "Usuário excluído";
  if (evento?.startsWith("deactivate_user")) return "Usuário desativado";
  if (evento?.startsWith("activate_user")) return "Usuário ativado";
  return evento;
}

function eventoBadgeClass(evento: string): string {
  if (evento === "login_success" || evento === "pin_success") return "bg-green-50 text-green-700 border-green-200";
  if (evento?.includes("fail") || evento?.includes("locked") || evento?.includes("blocked")) return "bg-red-50 text-red-700 border-red-200";
  if (evento?.includes("delete") || evento?.includes("deactivate")) return "bg-orange-50 text-orange-700 border-orange-200";
  return "bg-gray-100 text-gray-600 border-gray-200";
}

function LogsPage() {
  const list = useServerFn(adminListAccessLogs);
  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["access-logs"],
    queryFn: () => list({ data: { limit: 500 } }),
    refetchInterval: 30_000,
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ["profiles-simples"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("user_id, nome, display_name");
      return data ?? [];
    },
  });

  function nomeDoUsuario(userId: string | null | undefined) {
    if (!userId) return { nome: "—", uname: "" };
    const p = profiles.find((x) => x.user_id === userId);
    return { nome: p?.nome || userId.slice(0, 8), uname: (p as any)?.display_name || "" };
  }


  const [filtroEvento, setFiltroEvento] = useState("todos");
  const logsFiltrados = filtroEvento === "todos"
    ? logs
    : logs.filter((l: any) => (l.event ?? "").includes(filtroEvento));

  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs uppercase tracking-[0.2em] text-gold">Administração</div>
        <h1 className="font-display text-3xl font-bold text-primary flex items-center gap-2">
          <ShieldAlert className="h-7 w-7 text-gold" /> Logs de Acesso
        </h1>
        <p className="text-sm text-muted-foreground">
          Histórico de logins, validações de PIN e bloqueios. Visível somente para a Administração.
        </p>
      </div>

      <div className="flex justify-end">
        <Select value={filtroEvento} onValueChange={setFiltroEvento}>
          <SelectTrigger className="w-56">
            <SelectValue placeholder="Todos os eventos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os eventos</SelectItem>
            <SelectItem value="login">Logins</SelectItem>
            <SelectItem value="pin">Validações de PIN</SelectItem>
            <SelectItem value="delete">Exclusões</SelectItem>
            <SelectItem value="locked">Bloqueios</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-primary text-primary-foreground text-left text-xs uppercase tracking-wider">
              <tr>
                <th className="p-3">Data / Hora</th>
                <th className="p-3">Usuário</th>
                <th className="p-3">E-mail</th>
                <th className="p-3">Perfil</th>
                <th className="p-3">Evento</th>
                <th className="p-3">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading && (
                <tr><td colSpan={6} className="p-0"><TableSkeleton rows={10} cols={6} /></td></tr>
              )}
              {!isLoading && logsFiltrados.length === 0 && (
                <tr><td colSpan={6} className="p-0">
                  <EmptyState
                    icon={ShieldAlert}
                    title="Nenhum registro de acesso"
                    description="Os logins e ações de segurança aparecerão aqui."
                  />
                </td></tr>
              )}
              {logsFiltrados.map((l: any) => (
                <tr key={l.id} className="hover:bg-muted/40 transition-colors">
                  <td className="p-3 whitespace-nowrap">
                    {new Date(l.created_at).toLocaleString("pt-BR")}
                  </td>
                  <td className="p-3">
                    {(() => { const u = nomeDoUsuario(l.user_id); return (
                      <div>
                        <div className="font-medium">{u.nome}</div>
                        {u.uname && <div className="text-[11px] text-muted-foreground">@{u.uname}</div>}
                      </div>
                    ); })()}
                  </td>
                  <td className="p-3">{l.email || "—"}</td>
                  <td className="p-3">{l.perfil || "—"}</td>
                  <td className="p-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded border text-xs font-medium ${eventoBadgeClass(l.event)}`}>
                      {traduzirEvento(l.event)}
                    </span>
                  </td>
                  <td className="p-3 text-xs text-muted-foreground max-w-[140px]">
                    <span className="truncate block cursor-default" title={l.ip ?? "—"}>
                      {l.ip ?? "—"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
