import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Skeleton } from "@/components/ui/skeleton";
import { useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import listPlugin from "@fullcalendar/list";
import interactionPlugin from "@fullcalendar/interaction";
import ptBrLocale from "@fullcalendar/core/locales/pt-br";
import type { EventContentArg, EventInput } from "@fullcalendar/core";
import {
  CalendarDays, Plus, AlertTriangle, Clock, Timer, CheckCircle2,
  ShieldCheck, LayoutGrid, Building2, Trees, ArrowUpDown, ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  fetchManutencoes, localLabel, formatDateTime, statusBadgeClasses,
  isAtrasado, isPrazoVencido, labelAguardando, labelPrazoVencido, labelAtrasado,
  type Manutencao,
  toLocalDate,
} from "@/lib/manutencoes";
import { listAtivos, type Ativo } from "@/lib/ativos";

export const Route = createFileRoute("/_authenticated/calendario")({
  head: () => ({
    meta: [
      { title: "Calendário de Manutenção — Europa Manutenção" },
      { name: "description", content: "Calendário de chamados agendados e preventivas dos ativos do condomínio." },
      { property: "og:title", content: "Calendário de Manutenção — Europa Manutenção" },
      { property: "og:description", content: "Acompanhe chamados agendados e preventivas dos ativos." },
    ],
  }),
  component: CalendarioPage,
});

type ManutencaoExt = Manutencao & {
  data_prevista?: string | null;
  ativo_id?: string | null;
  created_at: string;
};

function statusEventColor(m: Manutencao) {
  if (m.prioridade === "Emergencial" && m.status !== "Concluído")
    return { bg: "#fef2f2", border: "#dc2626", text: "#991b1b" };
  if (isAtrasado(m)) return { bg: "#fff1f2", border: "#f43f5e", text: "#9f1239" };
  if (isPrazoVencido(m)) return { bg: "#fefce8", border: "#ca8a04", text: "#854d0e" };
  if (m.status === "Aguardando Aprovação") return { bg: "#fffbeb", border: "#d97706", text: "#92400e" };
  if (m.status === "Em Andamento") return { bg: "#eff6ff", border: "#3b82f6", text: "#1e40af" };
  if (m.status === "Concluído") return { bg: "#f0fdf4", border: "#16a34a", text: "#166534" };
  return { bg: "#f8fafc", border: "#94a3b8", text: "#475569" };
}

function eventDate(m: ManutencaoExt): string {
  return (m.data_prevista ?? m.data_inicio ?? m.created_at) as string;
}

function manutencaoParaEvento(m: ManutencaoExt): EventInput {
  const cor = statusEventColor(m);
  return {
    id: m.id,
    title: `${m.numero_chamado} · ${m.descricao?.slice(0, 25) ?? ""}`,
    start: eventDate(m),
    end: eventDate(m),
    backgroundColor: cor.bg,
    borderColor: cor.border,
    textColor: cor.text,
    extendedProps: { manutencao: m },
  };
}

function preventivaParaEvento(a: Ativo): EventInput {
  return {
    id: `prev-${a.id}`,
    title: `Preventiva · ${a.nome}`,
    start: a.proxima_preventiva as string,
    backgroundColor: "#faf5ff",
    borderColor: "#a855f7",
    textColor: "#6b21a8",
    extendedProps: { ativo: a },
  };
}

function renderEventContent(info: EventContentArg) {
  const m = info.event.extendedProps.manutencao as ManutencaoExt | undefined;
  if (!m) {
    return (
      <div className="px-1 py-0.5 overflow-hidden">
        <p className="text-[11px] font-semibold truncate">{info.event.title}</p>
      </div>
    );
  }
  const hora = m.data_prevista
    ? new Date(m.data_prevista).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
    : null;
  return (
    <div className="px-1 py-0.5 overflow-hidden leading-tight">
      <p className="text-[11px] font-semibold truncate">{m.numero_chamado}</p>
      <p className="text-[10px] opacity-80 truncate">{m.descricao?.slice(0, 20)}</p>
      {hora && <p className="text-[10px] opacity-70">{hora}</p>}
    </div>
  );
}

const FILTROS = [
  { id: "todos", label: "Todos", icon: LayoutGrid },
  { id: "torres", label: "Torres", icon: Building2 },
  { id: "areas", label: "Áreas Comuns", icon: Trees },
  { id: "elevadores", label: "Elevadores", icon: ArrowUpDown },
  { id: "preventivas", label: "Preventivas", icon: ShieldCheck },
  { id: "emergenciais", label: "Emergenciais", icon: AlertTriangle },
] as const;

function CalendarioPage() {
  const navigate = useNavigate();
  const calRef = useRef<FullCalendar | null>(null);
  const { data: manutData = [], isLoading: loadingManut } = useQuery({ queryKey: ["manutencoes"], queryFn: fetchManutencoes });
  const { data: ativos = [] } = useQuery({ queryKey: ["ativos"], queryFn: listAtivos });
  const [filtroAtivo, setFiltroAtivo] = useState<string>("todos");
  const [selected, setSelected] = useState<ManutencaoExt | null>(null);
  const [selectedDay, setSelectedDay] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [showProximas, setShowProximas] = useState(true);

  const manutencoes = manutData as ManutencaoExt[];
  const elevadorIds = useMemo(
    () => new Set((ativos as Ativo[]).filter(a => a.categoria === "Elevador").map(a => a.id)),
    [ativos],
  );
  const preventivas = useMemo(
    () => (ativos as Ativo[]).filter(a => !!a.proxima_preventiva),
    [ativos],
  );

  const now = new Date();
  const kpis = useMemo(() => {
    const pendentes = manutencoes.filter(m => m.status === "Pendente").length;
    const emAndamento = manutencoes.filter(m => m.status === "Em Andamento").length;
    const aguardando = manutencoes.filter(m => m.status === "Aguardando Aprovação").length;
    const atrasados = manutencoes.filter(isAtrasado).length;
    const concluidosMes = manutencoes.filter(m => {
      if (m.status !== "Concluído" || !m.data_conclusao) return false;
      const d = toLocalDate(m.data_conclusao);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;
    return [
      { label: "Pendentes", value: pendentes, sub: "em aberto", Icon: AlertTriangle, color: "text-red-500 bg-red-500/10" },
      { label: "Em andamento", value: emAndamento, sub: "em execução", Icon: Timer, color: "text-blue-500 bg-blue-500/10" },
      { label: "Atrasados", value: atrasados, sub: "prazo vencido", Icon: AlertTriangle, color: "text-rose-600 bg-rose-600/10" },
      { label: "Aguardando", value: aguardando, sub: "aguardando ação", Icon: Clock, color: "text-amber-500 bg-amber-500/10" },
      { label: "Concluídas", value: concluidosMes, sub: "este mês", Icon: CheckCircle2, color: "text-green-500 bg-green-500/10" },
      { label: "Preventivas", value: preventivas.length, sub: "programadas", Icon: ShieldCheck, color: "text-purple-500 bg-purple-500/10" },
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [manutencoes, preventivas]);

  const manutFiltradas = useMemo(() => {
    switch (filtroAtivo) {
      case "torres": return manutencoes.filter(m => !!m.torre);
      case "areas": return manutencoes.filter(m => m.local_manutencao === "Geral");
      case "elevadores": return manutencoes.filter(m => m.ativo_id && elevadorIds.has(m.ativo_id));
      case "emergenciais": return manutencoes.filter(m => m.prioridade === "Emergencial");
      case "preventivas": return [];
      default: return manutencoes;
    }
  }, [manutencoes, filtroAtivo, elevadorIds]);

  const events = useMemo<EventInput[]>(() => {
    const evs = manutFiltradas.filter(m => !!eventDate(m)).map(manutencaoParaEvento);
    if (filtroAtivo === "todos" || filtroAtivo === "preventivas") {
      evs.push(...preventivas.map(preventivaParaEvento));
    }
    return evs;
  }, [manutFiltradas, preventivas, filtroAtivo]);

  const proximas = useMemo(() => {
    const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
    return manutencoes
      .filter(m => m.status !== "Concluído" && eventDate(m) && toLocalDate(eventDate(m)) >= hoje)
      .sort((a, b) => +toLocalDate(eventDate(a)) - +toLocalDate(eventDate(b)))
      .slice(0, 6);
  }, [manutencoes]);

  const doDia = useMemo(
    () => manutencoes.filter(m => eventDate(m)?.slice(0, 10) === selectedDay),
    [manutencoes, selectedDay],
  );

  return (
    <div className="flex gap-6 max-w-[1600px] mx-auto">
      <div className="flex-1 min-w-0 space-y-5">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="h-11 w-11 rounded-xl bg-gold/15 text-gold grid place-items-center shrink-0">
              <CalendarDays className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-display text-3xl font-bold text-primary">Calendário de Manutenção</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Acompanhe os chamados agendados e preventivas dos ativos.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Acesso ao Mapa temporariamente desativado na interface (código preservado) */}

            <Link to="/manutencoes/nova">
              <Button size="sm"><Plus className="h-4 w-4 mr-2" /> Nova Manutenção</Button>
            </Link>
          </div>
        </header>

        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3">
          {kpis.map(k => (
            <div key={k.label} className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm flex items-center gap-3">
              <span className={`h-10 w-10 rounded-xl grid place-items-center shrink-0 ${k.color}`}>
                <k.Icon className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <div className="text-2xl font-bold leading-none text-foreground">{k.value}</div>
                <div className="text-xs font-medium text-foreground/80 mt-1 truncate">{k.label}</div>
                <div className="text-[11px] text-muted-foreground truncate">{k.sub}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          {FILTROS.map(f => {
            const active = filtroAtivo === f.id;
            return (
              <button
                key={f.id}
                onClick={() => setFiltroAtivo(f.id)}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                <f.icon className="h-3.5 w-3.5" />
                {f.label}
              </button>
            );
          })}
        </div>

        <div className="rounded-[var(--radius-card)] border border-border/60 bg-card p-3 md:p-4 shadow-[var(--shadow-card)] fc-europa">
          {loadingManut ? (
            <div className="space-y-3">
              <Skeleton className="h-9 w-full rounded-md" />
              <div className="grid grid-cols-7 gap-2">
                {Array.from({ length: 35 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full rounded-md" />
                ))}
              </div>
            </div>
          ) : (
          <FullCalendar
            ref={calRef}
            plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            locale={ptBrLocale}
            height="auto"
            headerToolbar={{
              left: "prev,next today",
              center: "title",
              right: "dayGridMonth,timeGridWeek,listWeek",
            }}
            events={events}
            dayMaxEvents={3}
            moreLinkContent={(n) => `+${n.num} mais`}
            nowIndicator
            eventContent={renderEventContent}
            dateClick={(info) => setSelectedDay(info.dateStr.slice(0, 10))}
            eventClick={(info) => {
              const m = info.event.extendedProps.manutencao as ManutencaoExt | undefined;
              const a = info.event.extendedProps.ativo as Ativo | undefined;
              if (m) setSelected(m);
              else if (a) navigate({ to: "/ativos/$id", params: { id: a.id } });
            }}
          />
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <Legend color="#dc2626" label="Emergencial" />
          <Legend color="#f43f5e" label="Atrasado (30+ dias)" />
          <Legend color="#ca8a04" label="Prazo vencido" />
          <Legend color="#d97706" label="Aguardando aprovação" />
          <Legend color="#3b82f6" label="Em andamento" />
          <Legend color="#16a34a" label="Concluído" />
          <Legend color="#a855f7" label="Preventiva" />
        </div>

        {/* Mobile: próximas manutenções */}
        <div className="md:hidden rounded-2xl border border-border/60 bg-card shadow-sm">
          <button
            onClick={() => setShowProximas(v => !v)}
            aria-expanded={showProximas}
            className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold min-h-11 transition-colors duration-150 hover:bg-muted/40 rounded-2xl"
          >
            Próximas manutenções
            <ChevronDown className={`h-4 w-4 transition-transform ${showProximas ? "rotate-180" : ""}`} />
          </button>
          {showProximas && (
            <div className="px-3 pb-3 space-y-2">
              {proximas.length === 0 && <p className="text-xs text-muted-foreground px-1">Nenhuma manutenção agendada.</p>}
              {proximas.map(m => <ProximaItem key={m.id} m={m} onClick={() => setSelected(m)} />)}
            </div>
          )}
        </div>
      </div>

      {/* Painel lateral */}
      <aside className="hidden md:block w-72 shrink-0 space-y-4">
        <div className="rounded-2xl border border-border/60 bg-card p-3 shadow-sm fc-mini">
          <FullCalendar
            plugins={[dayGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            locale={ptBrLocale}
            height="auto"
            headerToolbar={{ left: "prev", center: "title", right: "next" }}
            events={events.map(e => ({ ...e, title: "" }))}
            dayMaxEvents={0}
            dateClick={(info) => setSelectedDay(info.dateStr.slice(0, 10))}
          />
        </div>

        <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-foreground mb-3">Próximas manutenções</h2>
          <div className="space-y-2">
            {proximas.length === 0 && <p className="text-xs text-muted-foreground">Nenhuma manutenção agendada.</p>}
            {proximas.map(m => <ProximaItem key={m.id} m={m} onClick={() => setSelected(m)} />)}
          </div>
        </div>

        <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-foreground mb-1">Chamados do dia</h2>
          <p className="text-[11px] text-muted-foreground mb-3">
            {new Date(`${selectedDay}T12:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "long" })}
          </p>
          <div className="space-y-2">
            {doDia.length === 0 && <p className="text-xs text-muted-foreground">Sem chamados nesta data.</p>}
            {doDia.map(m => <ProximaItem key={m.id} m={m} onClick={() => setSelected(m)} />)}
          </div>
        </div>
      </aside>

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Chamado {selected?.numero_chamado}</SheetTitle>
          </SheetHeader>
          {selected && (
            <div className="mt-4 space-y-3 text-sm">
              <div>
                <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${statusBadgeClasses(selected.status)}`}>
                  {selected.status}
                </span>
                {isAtrasado(selected) && (
                  <div className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-rose-700">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    {labelAtrasado(selected)}
                  </div>
                )}
                {isPrazoVencido(selected) && (
                  <div className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-yellow-700">
                    <Clock className="h-3.5 w-3.5" />
                    {labelPrazoVencido(selected)}
                  </div>
                )}
                {selected.status === "Aguardando Aprovação" && (
                  <div className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-amber-600">
                    <Clock className="h-3.5 w-3.5" />
                    {labelAguardando(selected)}
                  </div>
                )}
              </div>
              <Row label="Local" value={localLabel(selected)} />
              <Row label="Prioridade" value={selected.prioridade} />
              <Row label="Categoria" value={selected.categoria} />
              <Row label="Responsável" value={selected.funcionario ?? "—"} />
              <Row label="Prevista" value={formatDateTime(selected.data_prevista ?? null)} />
              <Row label="Descrição" value={selected.descricao} />
              <Link to="/manutencoes/$id" params={{ id: selected.id }} onClick={() => setSelected(null)}>
                <Button className="w-full mt-2">Abrir chamado</Button>
              </Link>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function ProximaItem({ m, onClick }: { m: ManutencaoExt; onClick: () => void }) {
  const cor = statusEventColor(m);
  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-xl border border-border/60 bg-background hover:bg-muted/60 transition-colors p-2.5 flex gap-2"
    >
      <span className="w-1 rounded-full shrink-0" style={{ background: cor.border }} />
      <span className="min-w-0">
        <span className="block text-xs font-semibold text-foreground truncate">{m.numero_chamado}</span>
        <span className="block text-[11px] text-muted-foreground truncate">{m.descricao}</span>
        <span className="block text-[11px] text-muted-foreground/80 mt-0.5">
          {toLocalDate(eventDate(m)).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })} · {localLabel(m)}
        </span>
      </span>
    </button>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      <div className="text-xs uppercase text-muted-foreground">{label}</div>
      <div className="col-span-2 text-foreground break-words">{value}</div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md bg-muted px-2 py-1">
      <span className="h-2 w-2 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}
