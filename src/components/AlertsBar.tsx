import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  AlertTriangle, Flame, CheckCircle2, Clock, CalendarClock,
} from "lucide-react";
import {
  fetchManutencoes, isAtrasado, diasAguardandoAprovacao,
  labelAguardando, labelAtrasado, type Manutencao,
  parseDateOnly,
} from "@/lib/manutencoes";
import { listAtivos, type Ativo } from "@/lib/ativos";

type AlertItem = {
  key: string;
  icon: typeof AlertTriangle;
  label: string;
  to: { path: string; params?: Record<string, string> };
  cls: string;
};

export function AlertsBar() {
  const { data: manut = [] } = useQuery({
    queryKey: ["manutencoes"],
    queryFn: fetchManutencoes,
  });
  const { data: ativos = [] } = useQuery({
    queryKey: ["ativos"],
    queryFn: listAtivos,
  });

  const items = manut as Manutencao[];
  const hoje = new Date().toISOString().slice(0, 10);
  const toManut = (m: Manutencao) => ({ path: "/manutencoes/$id", params: { id: m.id } });

  // 1. Emergencial
  const alertasEmergencial: AlertItem[] = items
    .filter(m => m.prioridade === "Emergencial" && m.status !== "Concluído" && m.status !== "Cancelado")
    .map(m => ({
      key: `emerg-${m.id}`, icon: Flame,
      label: `${m.numero_chamado} — prioridade emergencial`,
      to: toManut(m),
      cls: "text-red-600 border-red-600/30 bg-red-500/10",
    }));

  // 2. Preventiva vencida
  const alertasPreventiva: AlertItem[] = (ativos as Ativo[])
    .filter(a => a.proxima_preventiva && parseDateOnly(a.proxima_preventiva) < new Date())
    .map(a => ({
      key: `prev-${a.id}`, icon: CalendarClock,
      label: `Preventiva vencida: ${a.nome}`,
      to: { path: "/ativos/$id", params: { id: a.id } },
      cls: "text-purple-600 border-purple-600/30 bg-purple-500/10",
    }));

  // 3. Aguardando Aprovação há mais de 2 dias
  const alertasAguardando: AlertItem[] = items
    .filter(m => (diasAguardandoAprovacao(m) ?? 0) > 2)
    .map(m => ({
      key: `aguard-${m.id}`, icon: Clock,
      label: labelAguardando(m) ?? "",
      to: toManut(m),
      cls: "text-amber-600 border-amber-600/30 bg-amber-500/10",
    }));

  // 4. Atrasados (30+ dias)
  const alertasAtrasados: AlertItem[] = items
    .filter(isAtrasado)
    .map(m => ({
      key: `atr-${m.id}`, icon: AlertTriangle,
      label: labelAtrasado(m) ?? "",
      to: toManut(m),
      cls: "text-rose-700 border-rose-700/30 bg-rose-500/10",
    }));

  // 5. Concluídos hoje
  const alertasConcluidos: AlertItem[] = items
    .filter(m => m.status === "Concluído" && m.data_conclusao?.slice(0, 10) === hoje)
    .map(m => ({
      key: `hoje-${m.id}`, icon: CheckCircle2,
      label: `${m.numero_chamado} concluído hoje`,
      to: toManut(m),
      cls: "text-green-600 border-green-600/30 bg-green-500/10",
    }));

  const sorted = [
    ...alertasEmergencial,
    ...alertasPreventiva,
    ...alertasAguardando,
    ...alertasAtrasados,
    ...alertasConcluidos,
  ].slice(0, 5);

  if (sorted.length === 0) return null;

  return (
    <div className="no-print flex flex-wrap items-center gap-2 px-4 md:px-8 py-2 bg-muted/50 border-b text-xs">
      <span className="font-semibold uppercase tracking-wider text-muted-foreground mr-2">Alertas:</span>
      {sorted.map(a => {
        const Icon = a.icon;
        return (
          <Link
            key={a.key}
            to={a.to.path as never}
            params={a.to.params as never}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border hover:opacity-80 ${a.cls}`}
          >
            <Icon className="h-3 w-3" />
            <span className="truncate max-w-[240px]">{a.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
