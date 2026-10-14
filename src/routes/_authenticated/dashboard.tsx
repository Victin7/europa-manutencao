import { createFileRoute, Link } from "@tanstack/react-router";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  TORRES, isAtrasado, isPrazoVencido, localLabel, fetchManutencoes, type Manutencao,
} from "@/lib/manutencoes";
import { useIsAdmin } from "@/hooks/use-role";

import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Area, AreaChart,
} from "recharts";
import {
  Activity, AlertTriangle, CheckCircle2, Clock, Flame, ListChecks, Plus,
  ClipboardList, Printer, BarChart3, Users, Database, FlaskConical,
  ChevronRight, Building, Calendar,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/dashboard")({ component: Dashboard });

const LOCAIS_DASH = [
  ...TORRES.map(t => ({ id: t.id, nome: t.nome })),
  { id: "Geral", nome: "Áreas Comuns" },
];

// Build a 7-day sparkline (Sex..Hoje) for a filter predicate
function buildSpark(items: Manutencao[], predicate: (m: Manutencao) => boolean) {
  const now = new Date();
  const out: { d: number; v: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const next = new Date(day.getTime() + 24 * 60 * 60 * 1000);
    const v = items.filter(m => {
      if (!predicate(m)) return false;
      const c = new Date(m.created_at);
      return c >= day && c < next;
    }).length;
    out.push({ d: i, v });
  }
  return out;
}

function Sparkline({ data, color }: { data: { d: number; v: number }[]; color: string }) {
  const id = `sp-${color.replace(/[^a-z0-9]/gi, "")}`;
  return (
    <ResponsiveContainer width="100%" height={36}>
      <AreaChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.35} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area type="monotone" dataKey="v" stroke={color} strokeWidth={1.75} fill={`url(#${id})`} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

type KpiDef = {
  key: string;
  label: string;
  sub: string;
  value: number;
  pctBadge?: { text: string; up: boolean };
  icon: React.ElementType;
  iconWrap: string;
  spark: { d: number; v: number }[];
  color: string;
};

function Dashboard() {
  const isAdmin = useIsAdmin();
  const [showDbInfo, setShowDbInfo] = useState(false);
  const [diagnostic, setDiagnostic] = useState<{
    total: number | null; lastQuery: string | null;
    status: "Conectado" | "Desconectado" | "Testando"; messages: string[];
  }>({ total: null, lastQuery: null, status: "Desconectado", messages: [] });

  const { data: items = [], isLoading, dataUpdatedAt, error, isError, isFetching } = useQuery({
    queryKey: ["manutencoes"],
    queryFn: fetchManutencoes,
  });

  async function testDatabase() {
    setDiagnostic({ total: null, lastQuery: new Date().toLocaleString("pt-BR"), status: "Testando", messages: ["Testando conexão..."] });
    try {
      const data = await fetchManutencoes();
      setDiagnostic({
        total: data.length,
        lastQuery: new Date().toLocaleString("pt-BR"),
        status: "Conectado",
        messages: [
          "✅ Conectado ao banco",
          "✅ Tabela manutencoes encontrada",
          data.length > 0 ? `✅ ${data.length} registros carregados` : "❌ Nenhum registro encontrado",
        ],
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Erro desconhecido";
      setDiagnostic({
        total: null,
        lastQuery: new Date().toLocaleString("pt-BR"),
        status: "Desconectado",
        messages: [`❌ ${message}`],
      });
    }
  }

  const total = items.length;
  const pendentes = items.filter(i => i.status === "Pendente").length;
  const andamento = items.filter(i => i.status === "Em Andamento").length;
  const aguardando = items.filter(i => i.status === "Aguardando Aprovação").length;
  const concluidas = items.filter(i => i.status === "Concluído").length;
  const emergenciais = items.filter(i => i.prioridade === "Emergencial" && i.status !== "Concluído").length;
  const atrasadas = items.filter(isAtrasado).length;
  const prazoVencido = items.filter(isPrazoVencido).length;
  const pct = (n: number) => total === 0 ? 0 : Math.round((n / total) * 100);

  const estatisticasPorTorre = useMemo(() =>
    LOCAIS_DASH.map(l => {
      const inT = items.filter(m => m.local_manutencao === l.id);
      const pend = inT.filter(m => m.status === "Pendente").length;
      const andam = inT.filter(m => m.status === "Em Andamento").length;
      const emerg = inT.filter(m => m.prioridade === "Emergencial" && m.status !== "Concluído").length;
      const atras = inT.filter(isAtrasado).length;
      const prazoVenc = inT.filter(isPrazoVencido).length;
      const aguardandoTorre = inT.filter(m => m.status === "Aguardando Aprovação").length;
      const concl = inT.filter(m => m.status === "Concluído").length;
      return { l, pend, andam, emerg, atras, prazoVenc, aguardandoTorre, concl,
        ativos: pend + andam + emerg + atras + prazoVenc + aguardandoTorre };
    }), [items]);

  const kpis: KpiDef[] = useMemo(() => [
    {
      key: "total", label: "Total", sub: "Todos os chamados", value: total,
      icon: ClipboardList, iconWrap: "bg-primary/10 text-primary",
      spark: buildSpark(items, () => true), color: "var(--primary)",
    },
    {
      key: "pend", label: "Pendentes", sub: "Aguardando início", value: pendentes,
      icon: Clock, iconWrap: "bg-[color:var(--danger)]/10 text-[color:var(--danger)]",
      spark: buildSpark(items, m => m.status === "Pendente"), color: "var(--danger)",
    },
    {
      key: "and", label: "Em andamento", sub: "Em execução", value: andamento,
      pctBadge: { text: `${pct(andamento)}%`, up: true },
      icon: Activity, iconWrap: "bg-[color:var(--chart-3)]/10 text-[color:var(--chart-3)]",
      spark: buildSpark(items, m => m.status === "Em Andamento"), color: "var(--chart-3)",
    },
    {
      key: "aguard", label: "Aguardando", sub: "Aguardando aprovação", value: aguardando,
      icon: Clock, iconWrap: "bg-[color:var(--warning)]/10 text-[color:var(--warning)]",
      spark: buildSpark(items, m => m.status === "Aguardando Aprovação"), color: "var(--warning)",
    },
    {
      key: "concl", label: "Concluídas", sub: "Serviços finalizados", value: concluidas,
      pctBadge: { text: `${pct(concluidas)}%`, up: true },
      icon: CheckCircle2, iconWrap: "bg-[color:var(--success)]/10 text-[color:var(--success)]",
      spark: buildSpark(items, m => m.status === "Concluído"), color: "var(--success)",
    },
    {
      key: "emerg", label: "Emergenciais", sub: "Alta prioridade", value: emergenciais,
      icon: Flame, iconWrap: "bg-gold/15 text-gold",
      spark: buildSpark(items, m => m.prioridade === "Emergencial"), color: "var(--gold)",
    },
    {
      key: "vencido", label: "Prazo Vencido", sub: "Até 29 dias após a data", value: prazoVencido,
      icon: Clock, iconWrap: "bg-yellow-400/15 text-yellow-600",
      spark: buildSpark(items, isPrazoVencido), color: "#ca8a04",
    },
    {
      key: "atras", label: "Atrasadas", sub: "30+ dias após a data", value: atrasadas,
      pctBadge: { text: `${pct(atrasadas)}%`, up: false },
      icon: AlertTriangle, iconWrap: "bg-[color:var(--danger)]/10 text-[color:var(--danger)]",
      spark: buildSpark(items, isAtrasado), color: "var(--danger)",
    },
  ], [items, total, pendentes, andamento, aguardando, concluidas, emergenciais, atrasadas, prazoVencido]);

  // Donut de status (card escuro)
  const donut = [
    { name: "Pendentes", value: pendentes, color: "#ef4444" },
    { name: "Em andamento", value: andamento, color: "#3b82f6" },
    { name: "Aguardando aprovação", value: aguardando, color: "#f59e0b" },
    { name: "Concluídas", value: concluidas, color: "#22c55e" },
  ];
  const donutTotal = donut.reduce((s, d) => s + d.value, 0);

  // Recentes: usa timeline_events quando houver
  const recent = items.slice(0, 4);

  // Por local
  const porLocal = LOCAIS_DASH.map(l => ({
    ...l, total: items.filter(i => i.local_manutencao === l.id).length,
  })).filter(x => x.total > 0).sort((a, b) => b.total - a.total).slice(0, 5);
  const localMax = Math.max(1, ...porLocal.map(x => x.total));

  // Resumo semanal (últimos 7 dias)
  const semanal = (() => {
    const dias = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
    const now = new Date();
    const out: { name: string; v: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const next = new Date(day.getTime() + 24 * 60 * 60 * 1000);
      const v = items.filter(m => {
        const c = new Date(m.created_at);
        return c >= day && c < next;
      }).length;
      out.push({ name: i === 0 ? "Hoje" : dias[day.getDay()], v });
    }
    return out;
  })();

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto pb-8">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground font-semibold">
            Bem-vindo(a) ao painel
          </div>
          <h1 className="font-display text-3xl md:text-[2.4rem] leading-tight font-bold text-primary tracking-tight mt-1">
            Visão geral das manutenções
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            Acompanhe em tempo real a gestão de manutenções do Condomínio Europa.
          </p>
        </div>
        <Link
          to="/manutencoes/nova"
          className="inline-flex items-center gap-2 rounded-xl bg-gold text-gold-foreground px-5 py-3 text-sm font-semibold shadow-sm hover:brightness-105 transition"
        >
          <Plus className="h-4 w-4" /> Nova Manutenção
        </Link>
      </header>

      {/* KPI row */}
      {isLoading ? (
        <section aria-busy="true" aria-label="Carregando indicadores" className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 xl:grid-cols-7 gap-3">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-[var(--radius-card)]" />
          ))}
        </section>
      ) : (
      <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 xl:grid-cols-7 gap-3">
        {kpis.map(k => (
          <div key={k.key} className="rounded-2xl bg-card border border-border/60 p-4 shadow-[var(--shadow-card)] transition-all duration-150 hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-0.5">
            <div className="flex items-start justify-between gap-2">
              <div className={`h-9 w-9 rounded-lg grid place-items-center ${k.iconWrap}`}>
                <k.icon className="h-4 w-4" />
              </div>
              {k.pctBadge ? (
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${k.pctBadge.up ? "bg-[color:var(--success)]/10 text-[color:var(--success)]" : "bg-[color:var(--danger)]/10 text-[color:var(--danger)]"}`}>
                  {k.pctBadge.up ? "↗" : "↘"} {k.pctBadge.text}
                </span>
              ) : <span />}
            </div>
            <div className="mt-2">
              <div className="font-display text-2xl font-bold text-primary tabular-nums leading-none">{k.value}</div>
              <div className="text-[11px] font-semibold text-foreground mt-1">{k.label}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">{k.sub}</div>
            </div>
            <div className="mt-2 -mx-1">
              <Sparkline data={k.spark} color={k.color} />
            </div>
          </div>
        ))}
      </section>
      )}

      {/* Ações rápidas */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <QuickAction icon={<Plus className="h-4 w-4" />} label="Nova manutenção" to="/manutencoes/nova" tone="gold" />
        <QuickAction icon={<AlertTriangle className="h-4 w-4" />} label="Ver emergenciais" to="/manutencoes" toSearch={{ filtro: "emergencial" }} tone="danger" />
        <QuickAction icon={<Calendar className="h-4 w-4" />} label="Calendário" to="/calendario" tone="info" />
        {/* Quick action "Mapa do condomínio" temporariamente desativada na interface (código preservado) */}
      </section>


      {/* Row 2: Status donut (dark) + Recent activity */}
      <section className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <Card className="lg:col-span-3 rounded-2xl bg-primary text-primary-foreground border-0 p-6 shadow-sm">
          <div className="flex items-start justify-between mb-4">
            <h3 className="font-display text-lg font-semibold">Manutenções por status</h3>
            <span className="text-xs px-2.5 py-1 rounded-md bg-white/10 text-primary-foreground/80">Este mês</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
            <div className="h-56 relative">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={donut.length && donutTotal > 0 ? donut : [{ name: "—", value: 1, color: "#334155" }]}
                    dataKey="value" nameKey="name" innerRadius={62} outerRadius={92} paddingAngle={donutTotal > 0 ? 3 : 0} stroke="none">
                    {(donutTotal > 0 ? donut : [{ color: "#334155" }]).map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, color: "#fff" }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 grid place-items-center pointer-events-none">
                <div className="text-center">
                  <div className="text-[10px] uppercase tracking-widest text-primary-foreground/60">Total</div>
                  <div className="font-display text-3xl font-bold">{total}</div>
                </div>
              </div>
            </div>
            <ul className="space-y-3">
              {donut.map(d => {
                const p = donutTotal ? Math.round((d.value / donutTotal) * 100) : 0;
                return (
                  <li key={d.name} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: d.color }} />
                      <span className="text-primary-foreground/85">{d.name}</span>
                    </span>
                    <span className="flex items-center gap-4 tabular-nums">
                      <span className="font-semibold">{d.value}</span>
                      <span className="text-primary-foreground/60 w-9 text-right">{p}%</span>
                    </span>
                  </li>
                );
              })}
              <li className="pt-3 mt-2 border-t border-white/10 text-xs text-primary-foreground/60 text-center">
                Total de {total} manutenções
              </li>
            </ul>
          </div>
        </Card>

        <Card className="lg:col-span-2 rounded-2xl border border-border/60 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display text-lg font-semibold text-primary">Atividades recentes</h3>
            <Link to="/manutencoes" className="text-xs font-semibold text-gold hover:text-primary transition">Ver todas</Link>
          </div>
          {recent.length === 0 ? (
            <div className="text-sm text-muted-foreground py-8 text-center">Sem atividades ainda.</div>
          ) : (
            <ul className="divide-y divide-border/60">
              {recent.map(m => {
                const done = m.status === "Concluído";
                const running = m.status === "Em Andamento";
                const Icon = done ? CheckCircle2 : running ? Activity : Clock;
                const iconCls = done
                  ? "bg-[color:var(--success)]/10 text-[color:var(--success)]"
                  : running
                    ? "bg-[color:var(--chart-3)]/10 text-[color:var(--chart-3)]"
                    : "bg-muted text-muted-foreground";
                const when = new Date(m.updated_at ?? m.created_at);
                const timeStr = when.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
                return (
                  <li key={m.id}>
                    <Link to="/manutencoes/$id" params={{ id: m.id }} className="flex items-center gap-3 py-3 group">
                      <span className={`h-9 w-9 rounded-lg grid place-items-center shrink-0 ${iconCls}`}>
                        <Icon className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold text-foreground truncate">
                          Manutenção {m.numero_chamado} {done ? "concluída" : running ? "em andamento" : "pendente"}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">{localLabel(m)}</div>
                      </div>
                      <div className="text-xs text-muted-foreground shrink-0 flex items-center gap-1">
                        {timeStr}
                        <ChevronRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition" />
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </section>

      {/* Torres */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display text-lg font-semibold text-primary flex items-center gap-2">
            <Building className="h-5 w-5 text-gold" /> Estatísticas por Torre
          </h3>
          <span className="text-xs text-muted-foreground">Clique para filtrar</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {estatisticasPorTorre.map(({ l, pend, andam, emerg, atras, prazoVenc, aguardandoTorre, concl, ativos }) => {
            return (
              <Link
                key={l.id}
                to="/manutencoes"
                search={l.id !== "Geral" ? { torre: l.id } : undefined}
                className={`rounded-2xl border border-border/60 bg-card p-4 shadow-[var(--shadow-card)] cursor-pointer transition-all duration-150 hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-0.5 ${ativos === 0 ? "opacity-50" : ""}`}
              >
                <div className="flex items-center justify-between">
                  <div className="text-sm font-bold text-primary">
                    {l.id === "Geral" ? "Áreas Gerais" : `Torre ${l.id}`}
                  </div>
                  <div className="text-[11px] text-muted-foreground truncate ml-2">{l.nome}</div>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-3 text-[11px]">
                  <MiniBadge dot="#ef4444" label={`${pend} pend`} />
                  <MiniBadge dot="#3b82f6" label={`${andam} andto`} />
                  <MiniBadge dot="#f97316" label={`${emerg} emerg`} />
                  <MiniBadge dot="#dc2626" label={`${atras} atras`} />
                  {prazoVenc > 0 && <MiniBadge dot="#ca8a04" label={`⏱ ${prazoVenc} venc`} />}
                  {aguardandoTorre > 0 && <MiniBadge dot="#d97706" label={`🕐 ${aguardandoTorre} aguard`} />}
                  <MiniBadge dot="#22c55e" label={`${concl} concl`} />
                </div>
              </Link>
            );
          })}
        </div>
      </section>


      {/* Row 3: Local + Semanal + Ações rápidas */}
      <section className="grid grid-cols-1 lg:grid-cols-6 gap-4">
        <Card className="lg:col-span-2 rounded-2xl border border-border/60 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-base font-semibold text-primary">Manutenções por local</h3>
            <Link to="/relatorios" className="text-xs font-semibold text-gold hover:text-primary transition">Ver relatório</Link>
          </div>
          {porLocal.length === 0 ? (
            <div className="text-sm text-muted-foreground py-6 text-center">Sem dados.</div>
          ) : (
            <ul className="space-y-3">
              {porLocal.map(l => {
                const p = total ? Math.round((l.total / total) * 100) : 0;
                const w = Math.round((l.total / localMax) * 100);
                return (
                  <li key={l.id}>
                    <Link to="/local/$local" params={{ local: l.id }} className="flex items-center gap-3 group">
                      <span className="text-xs text-muted-foreground w-16 shrink-0 group-hover:text-primary transition truncate">
                        {l.id === "Geral" ? "Áreas Comuns" : l.id}
                      </span>
                      <span className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <span className="block h-full bg-primary rounded-full" style={{ width: `${w}%` }} />
                      </span>
                      <span className="text-xs font-semibold text-primary tabular-nums w-16 text-right shrink-0">
                        {l.total} <span className="text-muted-foreground font-normal">({p}%)</span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card className="lg:col-span-2 rounded-2xl border border-border/60 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display text-base font-semibold text-primary">Resumo semanal</h3>
            <span className="text-xs px-2.5 py-1 rounded-md bg-muted text-muted-foreground">Últimos 7 dias</span>
          </div>
          <div className="h-40 -mx-2">
            <ResponsiveContainer>
              <LineChart data={semanal} margin={{ top: 8, right: 8, left: -22, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.25} vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={28} />
                <Tooltip />
                <Line type="monotone" dataKey="v" stroke="var(--primary)"
                  strokeWidth={2.2}
                  dot={{ fill: "var(--primary)", r: 3, stroke: "var(--card)", strokeWidth: 2 }}
                  activeDot={{ r: 5 }}
                  label={{ position: "top", fontSize: 10, fill: "var(--muted-foreground)" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="lg:col-span-2 rounded-2xl bg-primary text-primary-foreground border-0 p-6 shadow-sm">
          <h3 className="font-display text-base font-semibold mb-4">Ações rápidas</h3>
          <div className="grid grid-cols-2 gap-3">
            <Link to="/manutencoes/nova" className="group rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 p-3 flex flex-col items-center justify-center gap-2 text-center transition">
              <span className="h-9 w-9 rounded-lg bg-white/10 grid place-items-center text-gold"><Plus className="h-4 w-4" /></span>
              <span className="text-[11px] font-semibold text-primary-foreground/90 leading-tight">Nova Manutenção</span>
            </Link>
            <Link to="/impressoes" className="group rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 p-3 flex flex-col items-center justify-center gap-2 text-center transition">
              <span className="h-9 w-9 rounded-lg bg-white/10 grid place-items-center text-gold"><Printer className="h-4 w-4" /></span>
              <span className="text-[11px] font-semibold text-primary-foreground/90 leading-tight">Impressão de OS</span>
            </Link>
            <Link to="/relatorios" className="group rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 p-3 flex flex-col items-center justify-center gap-2 text-center transition">
              <span className="h-9 w-9 rounded-lg bg-white/10 grid place-items-center text-gold"><BarChart3 className="h-4 w-4" /></span>
              <span className="text-[11px] font-semibold text-primary-foreground/90 leading-tight">Relatórios</span>
            </Link>
            <Link to="/usuarios" className="group rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 p-3 flex flex-col items-center justify-center gap-2 text-center transition">
              <span className="h-9 w-9 rounded-lg bg-white/10 grid place-items-center text-gold"><Users className="h-4 w-4" /></span>
              <span className="text-[11px] font-semibold text-primary-foreground/90 leading-tight">Usuários</span>
            </Link>
          </div>

        </Card>
      </section>

      {isAdmin && (
        <div className="no-print">
          <button
            type="button"
            onClick={() => setShowDbInfo(v => !v)}
            className="text-xs text-muted-foreground underline underline-offset-4 hover:text-primary transition-colors"
          >
            {showDbInfo ? "Ocultar diagnóstico" : "Diagnóstico do banco"}
          </button>
          {showDbInfo && (
            <Card className="p-6 mt-3 rounded-2xl border-slate-200/60">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h3 className="font-display text-lg font-semibold flex items-center gap-2 text-primary">
                    <Database className="h-5 w-5 text-gold" /> Informações do Banco
                  </h3>
                  <div className="grid sm:grid-cols-3 gap-3 mt-4 text-sm">
                    <Info label="Total de registros" value={String(diagnostic.total ?? items.length)} />
                    <Info label="Última consulta" value={diagnostic.lastQuery ?? (dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleString("pt-BR") : "—")} />
                    <Info label="Status da conexão" value={isFetching || diagnostic.status === "Testando" ? "Testando" : isError ? "Desconectado" : "Conectado"} />
                  </div>
                </div>
                <Button onClick={testDatabase} disabled={diagnostic.status === "Testando"} variant="outline">
                  <FlaskConical className="h-4 w-4 mr-2" /> Testar Banco
                </Button>
              </div>
              {(diagnostic.messages.length > 0 || isError) && (
                <div className="mt-4 rounded-md border bg-muted/40 p-3 text-sm space-y-1">
                  {isError && <div>❌ {error instanceof Error ? error.message : "Falha ao carregar registros"}</div>}
                  {diagnostic.messages.map((m) => <div key={m}>{m}</div>)}
                </div>
              )}
            </Card>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="text-center text-xs text-muted-foreground pt-4 flex items-center justify-center gap-2">
        <ListChecks className="h-3.5 w-3.5" />
        Europa Manutenção © {new Date().getFullYear()} · Todos os direitos reservados
      </div>

    </div>
  );
}




function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/60 p-3 bg-card">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="font-semibold text-primary mt-1">{value}</div>
    </div>
  );
}

function MiniBadge({ dot, label }: { dot: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-muted text-foreground/80">
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: dot }} />
      {label}
    </span>
  );
}

type QuickTone = "gold" | "danger" | "info" | "success";

const TONE_STYLES: Record<QuickTone, { bg: string; hover: string; icon: string; text: string }> = {
  gold:    { bg: "bg-[color:var(--gold)]/10",    hover: "hover:bg-[color:var(--gold)]/20",    icon: "text-[color:var(--gold)]",    text: "text-primary" },
  danger:  { bg: "bg-[color:var(--danger)]/10",  hover: "hover:bg-[color:var(--danger)]/20",  icon: "text-[color:var(--danger)]",  text: "text-primary" },
  info:    { bg: "bg-primary/5",                 hover: "hover:bg-primary/10",                icon: "text-primary",                text: "text-primary" },
  success: { bg: "bg-[color:var(--success)]/10", hover: "hover:bg-[color:var(--success)]/20", icon: "text-[color:var(--success)]", text: "text-primary" },
};

function QuickAction({
  icon, label, to, toSearch, tone,
}: {
  icon: React.ReactNode;
  label: string;
  to: string;
  toSearch?: Record<string, string>;
  tone: QuickTone;
}) {
  const s = TONE_STYLES[tone];
  return (
    <Link
      to={to as never}
      search={toSearch as never}
      className={`group flex items-center gap-3 rounded-xl border border-transparent ${s.bg} ${s.hover} px-4 py-3 transition-colors`}
    >
      <span className={`h-9 w-9 rounded-lg grid place-items-center bg-background/70 ${s.icon}`}>
        {icon}
      </span>
      <span className={`text-sm font-semibold ${s.text}`}>{label}</span>
    </Link>
  );
}
