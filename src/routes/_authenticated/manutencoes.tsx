import { createFileRoute, Link, Outlet, useNavigate, useChildMatches } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { ManutencaoForm } from "@/components/ManutencaoForm";
import { SignedImage } from "@/components/SignedImage";
import { TimelineServico } from "@/components/TimelineServico";
import {
  CATEGORIAS, PRIORIDADES, STATUSES, STATUS_ATIVOS, TORRES, type Manutencao,
  statusBadgeClasses, formatDate, formatDateTime, isAtrasado, isPrazoVencido, diasAberto, labelAguardando, labelPrazoVencido, labelAtrasado, localLabel, fetchManutencoes, nomeTorre, formatPrevista, previstaCls, nomesEquipe,
  toLocalDate,
} from "@/lib/manutencoes";
import { useEquipe } from "@/hooks/use-equipe";
import { useAllowedTorres } from "@/hooks/use-role";
import { usePreferences } from "@/hooks/use-preferences";
import { ResponsiveContainer, AreaChart, Area } from "recharts";

import {
  Search, Plus, FileSpreadsheet, Printer, FileText, Pencil, CheckCircle2, Trash2, MoreVertical, RefreshCw, Eye, Play, SlidersHorizontal, Download, X,
  ListChecks, Clock, AlertTriangle, CheckCircle, PauseCircle, LayoutGrid, List as ListIcon, Building2, User, Briefcase, ChevronRight,
  ClipboardList, CalendarDays, ChevronLeft, HardHat,
} from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";

type TabKey = "todos" | "Pendente" | "Em Andamento" | "Aguardando Aprovação" | "Concluído";
type ViewMode = "list" | "cards";
type Modo = "ativos" | "historico";

type Ordenacao = "recente" | "antigo" | "prioridade" | "prazo";

type Search = {
  modo?: Modo;
  tab?: TabKey;
  mostrarConcluidos?: boolean;
  view?: ViewMode;
  filtro?: "emergencial" | "atrasado";
  torre?: string;
  local?: string;
  categoria?: string;
  prioridade?: string;
  funcionario?: string;
  q?: string;
  ordenacao?: Ordenacao;
};

export const Route = createFileRoute("/_authenticated/manutencoes")({
  component: ManutencoesShell,
  validateSearch: (s: Record<string, unknown>): Search => {
    const allowed: TabKey[] = ["todos", "Pendente", "Em Andamento", "Aguardando Aprovação", "Concluído"];
    const tab = typeof s.tab === "string" && (allowed as string[]).includes(s.tab) ? (s.tab as TabKey) : undefined;
    const view = s.view === "cards" ? "cards" : s.view === "list" ? "list" : undefined;
    const filtro = s.filtro === "emergencial" || s.filtro === "atrasado" ? s.filtro : undefined;
    const modo: Modo = s.modo === "historico" ? "historico" : "ativos";
    const torreAllowed = ["Geral", ...TORRES.map(t => t.id)];
    const torre = typeof s.torre === "string" && torreAllowed.includes(s.torre) ? s.torre : undefined;
    const str = (v: unknown) => (typeof v === "string" && v.length > 0 ? v : undefined);
    const ordAllowed: Ordenacao[] = ["recente", "antigo", "prioridade", "prazo"];
    const ordenacao = typeof s.ordenacao === "string" && (ordAllowed as string[]).includes(s.ordenacao)
      ? (s.ordenacao as Ordenacao) : undefined;
    return {
      modo,
      tab,
      view,
      filtro,
      torre,
      local: str(s.local),
      categoria: str(s.categoria),
      prioridade: str(s.prioridade),
      funcionario: str(s.funcionario),
      q: str(s.q),
      ordenacao,
      mostrarConcluidos: s.mostrarConcluidos === true || s.mostrarConcluidos === "true",
    };
  },
});

type Periodo = "all" | "hoje" | "semana" | "mes" | "ano";

function abreviarLocal(m: Manutencao): string {
  if (m.local_manutencao === "Geral") return `Geral · ${m.area_comum ?? "—"}`;
  const torre = m.torre ? m.torre.replace("Torre ", "") : (m.local_manutencao ?? "?");
  const unidade = m.unidade ?? "—";
  const sub = m.area_comum ?? "";
  return `${torre} · ${unidade}${sub ? ` · ${sub.replace("Hall de Serviço", "Hall Srv").replace("Hall Social", "Hall Soc")}` : ""}`;
}

function localCompletoStr(m: Manutencao): string {
  if (m.local_manutencao === "Geral") return `Geral — ${m.area_comum ?? "—"}`;
  return [m.torre ?? m.local_manutencao, m.unidade, m.area_comum].filter(Boolean).join(" · ");
}

function ManutencoesShell() {
  // Usa as rotas-filhas efetivamente montadas (mesma fonte do <Outlet />)
  // em vez de location.pathname, que pode estar dessincronizado do match tree.
  const childMatches = useChildMatches();
  if (childMatches.length > 0) return <Outlet />;
  return <ManutencoesPage />;
}

function ManutencoesPage() {
  const qc = useQueryClient();
  const navigate = useNavigate({ from: "/manutencoes" });
  const search = Route.useSearch();
  const { prefs, setPref, hydrated: prefsReady } = usePreferences();
  const modo: Modo = search.modo ?? "ativos";
  const tab: TabKey = search.tab ?? (prefs.manutencoes_tab as TabKey) ?? "todos";
  const mostrarConcluidos = !!search.mostrarConcluidos;
  const view: ViewMode = search.view ?? prefs.manutencoes_view ?? "list";
  const filtroEspecial = search.filtro;
  const torre = search.torre;

  const allowedTorres = useAllowedTorres();
  const torresVisiveis = allowedTorres ? TORRES.filter(t => allowedTorres.includes(t.id)) : TORRES;
  const { data: items = [], isFetching, isLoading } = useQuery({
    queryKey: ["manutencoes"],
    queryFn: fetchManutencoes,
  });

  const [q, setQ] = useState(search.q ?? "");
  const [local, setLocal] = useState<string>(search.local ?? "all");
  const [categoria, setCategoria] = useState<string>(search.categoria ?? "all");
  const [prioridade, setPrioridade] = useState<string>(search.prioridade ?? "all");
  const [funcionario, setFuncionario] = useState(search.funcionario ?? "");
  const [periodo, setPeriodo] = useState<Periodo>("all");
  const [ordenacao, setOrdenacao] = useState<Ordenacao>(search.ordenacao ?? "recente");

  // Sincroniza filtros com a URL (persistência ao voltar/refresh)
  useEffect(() => {
    navigate({
      search: (p: Search) => ({
        ...p,
        q: q || undefined,
        local: local !== "all" ? local : undefined,
        categoria: categoria !== "all" ? categoria : undefined,
        prioridade: prioridade !== "all" ? prioridade : undefined,
        funcionario: funcionario || undefined,
        ordenacao: ordenacao !== "recente" ? ordenacao : undefined,
      }),
      replace: true,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, local, categoria, prioridade, funcionario, ordenacao]);

  const [editing, setEditing] = useState<Manutencao | null>(null);
  const [concluding, setConcluding] = useState<Manutencao | null>(null);
  const [deleting, setDeleting] = useState<Manutencao | null>(null);
  const [iniciando, setIniciando] = useState<Manutencao | null>(null);
  const [drawer, setDrawer] = useState<Manutencao | null>(null);
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(prefs.manutencoes_per_page ?? 10);

  // Salva preferências (view/perPage/tab) por usuário
  useEffect(() => { if (prefsReady) setPref("manutencoes_view", view); }, [view, prefsReady, setPref]);
  useEffect(() => { if (prefsReady) setPref("manutencoes_per_page", perPage); }, [perPage, prefsReady, setPref]);
  useEffect(() => { if (prefsReady) setPref("manutencoes_tab", tab); }, [tab, prefsReady, setPref]);

  function invalidateAll() {
    qc.invalidateQueries({ queryKey: ["manutencoes"] });
    qc.invalidateQueries({ queryKey: ["manutencao"] });
    qc.invalidateQueries({ queryKey: ["local"] });
    qc.invalidateQueries({ queryKey: ["notas"] });
  }

  function setTab(next: TabKey) {
    navigate({ search: (p: Search) => ({ ...p, tab: next, filtro: undefined }) });
  }
  function setModo(next: Modo) {
    navigate({ search: (p: Search) => ({ ...p, modo: next === "ativos" ? undefined : next, tab: "todos", filtro: undefined, mostrarConcluidos: undefined }) });
  }
  function setView(v: ViewMode) {
    setPref("manutencoes_view", v);
    navigate({ search: (p: Search) => ({ ...p, view: v }) });
  }
  function setFiltroEspecial(f: "emergencial" | "atrasado" | undefined) {
    navigate({ search: (p: Search) => ({ ...p, filtro: f, tab: "todos" }) });
  }
  function setTorre(t: string | undefined) {
    navigate({ search: (p: Search) => ({ ...p, torre: t }) });
  }

  // Reset paginação sempre que qualquer filtro/tab/view mudar
  useEffect(() => { setPage(1); }, [tab, view, filtroEspecial, modo, torre, q, local, categoria, prioridade, funcionario, periodo, ordenacao, perPage]);

  function limparFiltros() {
    setQ(""); setLocal("all"); setCategoria("all"); setPrioridade("all"); setFuncionario(""); setPeriodo("all"); setOrdenacao("recente");
  }

  const updateMutation = useMutation({
    mutationFn: async ({ id, values }: { id: string; values: Partial<Manutencao> }) => {
      const { error } = await supabase.from("manutencoes").update(values as never).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Alterações salvas."); invalidateAll(); setEditing(null); },
    onError: () => toast.error("Não foi possível concluir a ação. Tente novamente."),
  });

  const concludeMutation = useMutation({
    mutationFn: async (m: Manutencao) => {
      const { error } = await supabase.from("manutencoes")
        .update({ status: "Concluído", data_conclusao: new Date().toISOString() } as never)
        .eq("id", m.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Chamado concluído com sucesso."); invalidateAll(); setConcluding(null); },
    onError: () => toast.error("Não foi possível concluir a ação. Tente novamente."),
  });

  const iniciarMutation = useMutation({
    mutationFn: async (m: Manutencao) => {
      const { error } = await supabase.from("manutencoes")
        .update({ status: "Em Andamento", data_inicio: new Date().toISOString() } as never)
        .eq("id", m.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Status atualizado para Em Andamento."); invalidateAll(); setIniciando(null); },
    onError: () => toast.error("Não foi possível concluir a ação. Tente novamente."),
  });

  const deleteMutation = useMutation({
    mutationFn: async (m: Manutencao) => {
      const { error } = await supabase.from("manutencoes").delete().eq("id", m.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Excluído com sucesso."); invalidateAll(); setDeleting(null); },
    onError: () => toast.error("Não foi possível concluir a ação. Tente novamente."),
  });

  // Contagens
  const counts = useMemo(() => ({
    todos: items.length,
    "Pendente": items.filter(i => i.status === "Pendente").length,
    "Em Andamento": items.filter(i => i.status === "Em Andamento").length,
    "Aguardando Aprovação": items.filter(i => i.status === "Aguardando Aprovação").length,
    "Concluído": items.filter(i => i.status === "Concluído").length,
    emergenciais: items.filter(i => i.prioridade === "Emergencial" && i.status !== "Concluído").length,
    atrasados: items.filter(isAtrasado).length,
    prazoVencido: items.filter(isPrazoVencido).length,
  }), [items]);

  const ativos = counts.Pendente + counts["Em Andamento"] + counts["Aguardando Aprovação"];

  // Sparklines: últimos 7 dias
  const spark = useMemo(() => {
    const days: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - i);
      days.push(d.toISOString().slice(0, 10));
    }
    const bucket = (pred: (m: Manutencao) => boolean, field: "created_at" | "data_conclusao" = "created_at") =>
      days.map(d => ({ d, v: items.filter(m => pred(m) && (m[field] ?? "").slice(0, 10) === d).length }));
    return {
      todos: bucket(() => true),
      pendente: bucket(m => m.status === "Pendente"),
      andamento: bucket(m => m.status === "Em Andamento"),
      aguardando: bucket(m => m.status === "Aguardando Aprovação"),
      concluidos: bucket(m => m.status === "Concluído", "data_conclusao"),
      emergenciais: bucket(m => m.prioridade === "Emergencial"),
      atrasados: bucket(m => isAtrasado(m)),
      prazoVencido: bucket(m => isPrazoVencido(m)),
    };
  }, [items]);

  // Resumo do dia
  const hoje = useMemo(() => {
    const today = new Date().toDateString();
    const concluidosHoje = items.filter(m => m.status === "Concluído" && m.data_conclusao && toLocalDate(m.data_conclusao).toDateString() === today).length;
    const funcs = new Set(items.filter(m => m.status !== "Concluído" && m.funcionario).map(m => m.funcionario!));
    const prests = new Set(items.filter(m => m.status !== "Concluído" && m.prestador_id).map(m => m.prestador_id!));
    return {
      pendentes: counts.Pendente,
      andamento: counts["Em Andamento"],
      aguardando: counts["Aguardando Aprovação"],
      concluidosHoje,
      funcionarios: funcs.size,
      prestadores: prests.size,
    };
  }, [items, counts]);

  // Agenda: próximos serviços agendados (data_prevista futura, não concluídos)
  const agenda = useMemo(() => {
    const now = Date.now();
    return items
      .filter(m => m.status !== "Concluído" && m.data_prevista)
      .map(m => ({ m, t: new Date(m.data_prevista!).getTime() }))
      .filter(x => x.t >= now - 24 * 60 * 60 * 1000)
      .sort((a, b) => a.t - b.t)
      .slice(0, 6);
  }, [items]);

  // Estatísticas por Torre / Geral
  type TorreStat = {
    id: string;
    nome: string;
    pendente: number;
    andamento: number;
    aguardando: number;
    concluido: number;
    emergencial: number;
    atrasado: number;
    total: number;
  };
  const torreStats = useMemo<TorreStat[]>(() => {
    const zero = () => ({ pendente: 0, andamento: 0, aguardando: 0, concluido: 0, emergencial: 0, atrasado: 0, total: 0 });
    const acc: Record<string, ReturnType<typeof zero>> = {};
    for (const t of TORRES) acc[t.id] = zero();
    acc["Geral"] = zero();
    for (const m of items) {
      const key = m.local_manutencao === "Geral" ? "Geral" : m.local_manutencao;
      if (!acc[key]) continue;
      acc[key].total++;
      if (m.status === "Pendente") acc[key].pendente++;
      else if (m.status === "Em Andamento") acc[key].andamento++;
      else if (m.status === "Aguardando Aprovação") acc[key].aguardando++;
      else if (m.status === "Concluído") acc[key].concluido++;
      if (m.prioridade === "Emergencial" && m.status !== "Concluído") acc[key].emergencial++;
      if (isAtrasado(m)) acc[key].atrasado++;
    }
    const list: TorreStat[] = TORRES
      .filter(t => !allowedTorres || allowedTorres.includes(t.id))
      .map(t => ({ id: t.id, nome: t.nome, ...acc[t.id] }));
    list.push({ id: "Geral", nome: "Áreas Comuns", ...acc["Geral"] });
    return list;
  }, [items, allowedTorres]);

  // Dashboard da torre selecionada
  const torreDash = useMemo(() => {
    if (!torre) return null;
    const inTorre = items.filter(m => m.local_manutencao === torre);
    const ativos = inTorre.filter(m => m.status !== "Concluído");
    const funcs = new Set(ativos.filter(m => m.funcionario).map(m => m.funcionario!));
    const prests = new Set(ativos.filter(m => m.prestador_responsavel || m.prestador_id).map(m => m.prestador_responsavel ?? m.prestador_id!));
    const ultimos = [...inTorre].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5);
    const pendentesTop = inTorre.filter(m => m.status === "Pendente").sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()).slice(0, 5);
    const emergTop = inTorre.filter(m => m.prioridade === "Emergencial" && m.status !== "Concluído").slice(0, 5);
    return { inTorre, ativos: ativos.length, funcionarios: [...funcs], prestadores: [...prests], ultimos, pendentesTop, emergTop };
  }, [items, torre]);


  const filtered = useMemo(() => {
    const now = new Date();
    const startOf = (kind: Periodo) => {
      const d = new Date(now); d.setHours(0, 0, 0, 0);
      if (kind === "semana") d.setDate(d.getDate() - 7);
      if (kind === "mes") d.setMonth(d.getMonth() - 1);
      if (kind === "ano") d.setFullYear(d.getFullYear() - 1);
      return d.getTime();
    };
    const arr = items.filter(m => {
      // Modo primário
      if (modo === "historico") {
        if (m.status !== "Concluído") return false;
      } else {
        // ativos: nunca mostra concluídos, ignora toggle
        if (m.status === "Concluído") return false;
      }
      if (filtroEspecial === "emergencial") { if (!(m.prioridade === "Emergencial")) return false; }
      else if (filtroEspecial === "atrasado") { if (!isAtrasado(m)) return false; }
      else if (tab === "todos") { /* no-op */ }
      else if (tab === "Concluído") { /* handled by modo */ }
      else { if (m.status !== tab) return false; }

      if (q) {
        const text = `${m.numero_chamado} ${m.numero_os} ${m.unidade ?? ""} ${m.area_comum ?? ""} ${m.local_manutencao} ${m.funcionario ?? ""} ${m.prestador_responsavel ?? ""} ${m.descricao} ${m.categoria} ${m.prioridade} ${m.status}`.toLowerCase();
        if (!text.includes(q.toLowerCase())) return false;
      }
      if (local !== "all" && m.local_manutencao !== local) return false;
      if (torre && m.local_manutencao !== torre) return false;
      if (categoria !== "all" && m.categoria !== categoria) return false;
      if (prioridade !== "all" && m.prioridade !== prioridade) return false;
      if (funcionario && !(m.funcionario ?? "").toLowerCase().includes(funcionario.toLowerCase())) return false;
      if (periodo !== "all") {
        const cutoff = startOf(periodo);
        if (new Date(m.created_at).getTime() < cutoff) return false;
      }
      return true;
    });
    const prioW: Record<string, number> = { Emergencial: 4, Alta: 3, "Média": 2, Baixa: 1 };
    arr.sort((a, b) => {
      if (ordenacao === "antigo") return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      if (ordenacao === "prioridade") return (prioW[b.prioridade] ?? 0) - (prioW[a.prioridade] ?? 0);
      if (ordenacao === "prazo") {
        const ax = a.data_prevista ? new Date(a.data_prevista).getTime() : Infinity;
        const bx = b.data_prevista ? new Date(b.data_prevista).getTime() : Infinity;
        return ax - bx;
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
    return arr;
  }, [items, q, local, torre, categoria, prioridade, funcionario, periodo, tab, mostrarConcluidos, ordenacao, filtroEspecial, modo]);

  function rows() {
    return filtered.map(m => ({
      "Nº Chamado": m.numero_chamado,
      "Nº OS": m.numero_os,
      Local: m.local_manutencao,
      Torre: m.torre ?? "",
      Unidade: m.unidade ?? "",
      "Área Comum": m.area_comum ?? "",
      Categoria: m.categoria,
      Prioridade: m.prioridade,
      Status: m.status,
      Funcionário: m.funcionario ?? "",
      "Data Vistoria": formatDate(m.data_vistoria),
      "Data Início": formatDate(m.data_inicio),
      "Data Conclusão": formatDate(m.data_conclusao),
      "Dias em Aberto": diasAberto(m),
      Descrição: m.descricao,
      Observação: m.observacao ?? "",
    }));
  }

  function exportExcel() {
    const ws = XLSX.utils.json_to_sheet(rows());
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Manutenções");
    XLSX.writeFile(wb, `manutencoes-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  function exportCSV() {
    const data = rows();
    if (data.length === 0) return;
    const headers = Object.keys(data[0]);
    const lines = [headers.join(";")];
    for (const r of data) {
      lines.push(headers.map(h => {
        const v = String((r as Record<string, unknown>)[h] ?? "").replace(/"/g, '""');
        return /[;\n"]/.test(v) ? `"${v}"` : v;
      }).join(";"));
    }
    const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `manutencoes-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const isConcluidosTab = modo === "historico";
  const filtrosCount = [local !== "all", categoria !== "all", prioridade !== "all", periodo !== "all", !!funcionario].filter(Boolean).length;

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * perPage;
  const pageEnd = Math.min(pageStart + perPage, filtered.length);
  const pagedItems = filtered.slice(pageStart, pageEnd);

  return (
    <div className="max-w-[1500px] mx-auto">
      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-6 space-y-6 lg:space-y-0">
        <div className="min-w-0 space-y-6">
          {/* CABEÇALHO */}
          <header className="relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-card via-card to-muted/30 p-5 sm:p-6 shadow-sm">
            {/* City illustration decoration */}
            <div aria-hidden className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 hidden md:block opacity-60">
              <svg width="220" height="120" viewBox="0 0 220 120" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="color-mix(in oklab, var(--primary) 8%, transparent)" />
                    <stop offset="100%" stopColor="transparent" />
                  </linearGradient>
                </defs>
                <ellipse cx="110" cy="90" rx="120" ry="55" fill="url(#sky)" />
                <g fill="color-mix(in oklab, var(--primary) 18%, transparent)" stroke="color-mix(in oklab, var(--primary) 35%, transparent)" strokeWidth="1">
                  <rect x="30" y="55" width="20" height="55" rx="1.5" />
                  <rect x="52" y="35" width="26" height="75" rx="1.5" />
                  <rect x="80" y="45" width="18" height="65" rx="1.5" />
                  <rect x="100" y="25" width="30" height="85" rx="1.5" />
                  <rect x="132" y="50" width="22" height="60" rx="1.5" />
                  <rect x="156" y="40" width="24" height="70" rx="1.5" />
                  <rect x="182" y="60" width="18" height="50" rx="1.5" />
                </g>
                <g fill="color-mix(in oklab, var(--gold) 45%, transparent)">
                  {[0,1,2,3].map(r => [0,1,2].map(c => (
                    <rect key={`a${r}${c}`} x={106 + c*7} y={32 + r*12} width="4" height="6" rx="0.5" />
                  )))}
                </g>
                <g stroke="color-mix(in oklab, var(--primary) 35%, transparent)" strokeWidth="1" fill="none">
                  <path d="M12 22 q4 -4 8 0 q4 4 8 0" />
                  <path d="M188 18 q4 -4 8 0 q4 4 8 0" />
                </g>
              </svg>
            </div>
            <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 flex items-start gap-3">
                <div className="hidden sm:grid place-items-center h-12 w-12 rounded-xl bg-gold/15 text-gold shrink-0">
                  <ClipboardList className="h-6 w-6" />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] uppercase tracking-[0.24em] text-gold font-semibold">Ordens de Serviço</div>
                  <h1 className="font-display text-3xl font-bold text-primary truncate">Manutenções</h1>
                  <p className="text-sm text-muted-foreground mt-1 max-w-xl">
                    Acompanhe todas as ordens de serviço do Condomínio Europa em tempo real.
                    {isFetching && !isLoading && <span className="ml-2 inline-flex items-center gap-1 text-xs"><RefreshCw className="h-3 w-3 animate-spin" /> atualizando</span>}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 relative">
                <Button variant="outline" size="sm" className="h-9" onClick={() => invalidateAll()} title="Atualizar">
                  <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? "animate-spin" : ""}`} /> Atualizar
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-9">
                      <Download className="h-4 w-4 mr-2" /> Exportar
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={exportCSV}><FileText className="h-4 w-4 mr-2" /> CSV</DropdownMenuItem>
                    <DropdownMenuItem onClick={exportExcel}><FileSpreadsheet className="h-4 w-4 mr-2" /> Excel</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button variant="outline" size="sm" className="h-9" onClick={() => window.print()}>
                  <Printer className="h-4 w-4 mr-2" /> Imprimir
                </Button>
                <Link to="/manutencoes/nova" className="inline-flex items-center rounded-md bg-gold text-gold-foreground px-4 h-9 text-sm font-semibold shadow-sm hover:opacity-90 transition-opacity">
                  <Plus className="h-4 w-4 mr-2" /> Nova Manutenção
                </Link>
              </div>
            </div>
          </header>

          {/* PRIMARY TABS: Ativos | Histórico */}
          <div className="no-print inline-flex items-center rounded-xl border border-border/60 bg-muted/40 p-1 shadow-sm">
            <button
              type="button"
              onClick={() => setModo("ativos")}
              className={`inline-flex items-center gap-2 rounded-lg px-4 h-9 text-sm font-semibold transition-all ${
                modo === "ativos"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <ListChecks className="h-4 w-4" /> Chamados Ativos
              <span className={`ml-1 h-5 min-w-[22px] px-1.5 rounded-full text-[10px] font-bold grid place-items-center ${
                modo === "ativos" ? "bg-gold text-gold-foreground" : "bg-muted-foreground/15 text-muted-foreground"
              }`}>{ativos}</span>
            </button>
            <button
              type="button"
              onClick={() => setModo("historico")}
              className={`inline-flex items-center gap-2 rounded-lg px-4 h-9 text-sm font-semibold transition-all ${
                modo === "historico"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <CheckCircle className="h-4 w-4" /> Histórico
              <span className={`ml-1 h-5 min-w-[22px] px-1.5 rounded-full text-[10px] font-bold grid place-items-center ${
                modo === "historico" ? "bg-gold text-gold-foreground" : "bg-muted-foreground/15 text-muted-foreground"
              }`}>{counts.Concluído}</span>
            </button>
          </div>

          {/* RESUMO EXECUTIVO — KPI Cards */}
          {modo === "ativos" ? (
            <section className="no-print grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-5 gap-3">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-[110px] rounded-xl" />)
              ) : (
                <>
                  <KpiCard label="Todos ativos" value={ativos} sub="Chamados abertos" icon={<ListChecks className="h-4 w-4" />} tone="neutral" active={tab === "todos" && !filtroEspecial} onClick={() => navigate({ search: (p: Search) => ({ ...p, tab: "todos", filtro: undefined }) })} spark={spark.todos} />
                  <KpiCard label="Pendentes" value={counts.Pendente} sub="Aguardando início" icon={<PauseCircle className="h-4 w-4" />} tone="danger" active={tab === "Pendente"} onClick={() => setTab("Pendente")} spark={spark.pendente} total={ativos || undefined} />
                  <KpiCard label="Em andamento" value={counts["Em Andamento"]} sub="Serviços ativos" icon={<Play className="h-4 w-4" />} tone="info" active={tab === "Em Andamento"} onClick={() => setTab("Em Andamento")} spark={spark.andamento} total={ativos || undefined} />
                  <KpiCard label="Aguardando" value={counts["Aguardando Aprovação"]} sub="Para aprovar" icon={<Clock className="h-4 w-4" />} tone="warning" active={tab === "Aguardando Aprovação"} onClick={() => setTab("Aguardando Aprovação")} spark={spark.aguardando} total={ativos || undefined} />
                  <KpiCard label="Emergenciais" value={counts.emergenciais} sub="Prioridade máxima" icon={<AlertTriangle className="h-4 w-4" />} tone="danger" active={filtroEspecial === "emergencial"} onClick={() => setFiltroEspecial(filtroEspecial === "emergencial" ? undefined : "emergencial")} spark={spark.emergenciais} total={ativos || undefined} />
                  <KpiCard label="Prazo Vencido" value={counts.prazoVencido} sub="Até 29 dias" icon={<Clock className="h-4 w-4" />} tone="warning" active={false} onClick={() => setTab("todos")} spark={spark.prazoVencido} total={ativos || undefined} />
                  <KpiCard label="Atrasados" value={counts.atrasados} sub="30+ dias" icon={<AlertTriangle className="h-4 w-4" />} tone="danger" active={filtroEspecial === "atrasado"} onClick={() => setFiltroEspecial(filtroEspecial === "atrasado" ? undefined : "atrasado")} spark={spark.atrasados} total={ativos || undefined} />
                </>
              )}
            </section>
          ) : (
            <section className="no-print grid grid-cols-2 sm:grid-cols-3 gap-3">
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-[110px] rounded-xl" />)
              ) : (
                <>
                  <KpiCard label="Concluídos" value={counts.Concluído} sub="Total finalizados" icon={<CheckCircle className="h-4 w-4" />} tone="success" active={tab === "todos"} onClick={() => setTab("todos")} spark={spark.concluidos} total={counts.todos} />
                  <KpiCard label="Hoje" value={hoje.concluidosHoje} sub="Concluídos no dia" icon={<CheckCircle2 className="h-4 w-4" />} tone="success" active={false} onClick={() => setTab("todos")} spark={spark.concluidos} />
                  <KpiCard label="Total geral" value={counts.todos} sub="Todos os chamados" icon={<ListChecks className="h-4 w-4" />} tone="neutral" active={false} onClick={() => setTab("todos")} spark={spark.todos} />
                </>
              )}
            </section>
          )}

          {/* ESTATÍSTICAS POR TORRE */}
          <TorresStatsGrid stats={torreStats} activeTorre={torre} onSelect={(t) => setTorre(torre === t ? undefined : t)} />

          {/* DASHBOARD DA TORRE SELECIONADA */}
          {torre && torreDash && (
            <TorreDashboardPanel
              torre={torre}
              dash={torreDash}
              onClear={() => setTorre(undefined)}
              onOpen={(m) => setDrawer(m)}
            />
          )}





      {/* PESQUISA + FILTROS */}
      <Card className="p-3 sm:p-4 space-y-3 no-print border-border/60 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Buscar por nº chamado, torre, apartamento, área, categoria, funcionário, prestador, descrição..."
              value={q}
              onChange={e => setQ(e.target.value)}
              aria-label="Buscar manutenções"
              className="pl-9 pr-9 h-10 bg-background border-border/70 transition-colors"
            />
            {q && (
              <button type="button" onClick={() => setQ("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 grid place-items-center rounded-md text-muted-foreground hover:bg-muted"
                aria-label="Limpar busca">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <Button type="button" variant={filtrosAbertos ? "default" : "outline"} size="sm" className="h-10" onClick={() => setFiltrosAbertos(v => !v)}>
            <SlidersHorizontal className="h-4 w-4 mr-2" /> Filtros
            {filtrosCount > 0 && (
              <span className="ml-2 h-5 min-w-[20px] px-1.5 rounded-full bg-gold text-gold-foreground text-[10px] font-bold grid place-items-center">
                {filtrosCount}
              </span>
            )}
          </Button>
          {/* View toggle */}
          <div className="inline-flex rounded-md border border-border/70 overflow-hidden h-10">
            <button type="button" onClick={() => setView("list")} title="Lista" aria-label="Visualizar em lista" aria-pressed={view === "list"}
              className={`px-3 min-w-11 grid place-items-center text-xs transition-colors duration-150 ${view === "list" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>
              <ListIcon className="h-4 w-4" />
            </button>
            <button type="button" onClick={() => setView("cards")} title="Cards" aria-label="Visualizar em cards" aria-pressed={view === "cards"}
              className={`px-3 min-w-11 grid place-items-center text-xs transition-colors duration-150 ${view === "cards" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>
        </div>

        {filtrosAbertos && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-2 pt-3 border-t border-border/60 animate-in fade-in slide-in-from-top-1 duration-200">
            <Input placeholder="Funcionário" value={funcionario} onChange={e => setFuncionario(e.target.value)} className="h-9" />
            <Select value={local} onValueChange={setLocal}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Local" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os locais</SelectItem>
                <SelectItem value="Geral">Geral (Áreas Comuns)</SelectItem>
                {torresVisiveis.map(t => <SelectItem key={t.id} value={t.id}>{t.id} – {t.nome}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={categoria} onValueChange={setCategoria}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Categoria" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas categorias</SelectItem>
                {CATEGORIAS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={prioridade} onValueChange={setPrioridade}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Prioridade" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas prioridades</SelectItem>
                {PRIORIDADES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={periodo} onValueChange={(v) => setPeriodo(v as Periodo)}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Período" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Qualquer período</SelectItem>
                <SelectItem value="hoje">Hoje</SelectItem>
                <SelectItem value="semana">Esta Semana</SelectItem>
                <SelectItem value="mes">Este Mês</SelectItem>
                <SelectItem value="ano">Este Ano</SelectItem>
              </SelectContent>
            </Select>
            <Select value={ordenacao} onValueChange={(v) => setOrdenacao(v as typeof ordenacao)}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Ordenação" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="recente">Mais recentes</SelectItem>
                <SelectItem value="antigo">Mais antigos</SelectItem>
                <SelectItem value="prioridade">Prioridade</SelectItem>
                <SelectItem value="prazo">Prazo (agendado)</SelectItem>
              </SelectContent>
            </Select>
            <div className="md:col-span-2 lg:col-span-3 xl:col-span-6 flex flex-wrap gap-2 justify-end">
              <Button type="button" variant="ghost" size="sm" onClick={limparFiltros}>
                <X className="h-4 w-4 mr-1" /> Limpar
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => invalidateAll()}>
                <RefreshCw className="h-4 w-4 mr-1" /> Atualizar
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Info bar */}
      <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
        <div>
          {isLoading ? (
            <span>Carregando chamados…</span>
          ) : (
            <>
              Exibindo <span className="font-semibold text-foreground">{Math.min(pagedItems.length, filtered.length)}</span> de{" "}
              <span className="font-semibold text-foreground">{filtered.length}</span> chamado(s)
            </>
          )}
          {filtroEspecial === "emergencial" && <span className="ml-2 inline-flex items-center gap-1 text-[color:var(--danger)]"><AlertTriangle className="h-3 w-3" /> emergenciais</span>}
          {filtroEspecial === "atrasado" && <span className="ml-2 inline-flex items-center gap-1 text-[color:var(--warning)]"><AlertTriangle className="h-3 w-3" /> atrasados</span>}
        </div>
        {(filtroEspecial || tab !== "todos") && (
          <button type="button" className="text-xs text-primary hover:underline" onClick={() => navigate({ search: (p: Search) => ({ ...p, tab: "todos", filtro: undefined }) })}>
            ← Ver todos os ativos
          </button>
        )}
      </div>

      {/* LISTA */}
      {isConcluidosTab ? (
        <ConcluidosTable items={filtered} isLoading={isLoading} onEdit={(m) => setEditing(m)} onDelete={(m) => setDeleting(m)} onView={(m) => setDrawer(m)} />
      ) : (
        <>
          {/* Mobile cards + Desktop when view=cards */}
          <div className={view === "cards" ? "" : "hidden"}>
            <CardsView
              items={filtered}
              isLoading={isLoading}
              onOpen={(m) => setDrawer(m)}
              onEdit={(m) => setEditing(m)}
              onIniciar={(m) => setIniciando(m)}
              onConcluir={(m) => setConcluding(m)}
              onDelete={(m) => setDeleting(m)}
            />
          </div>
          {view === "list" && (
            <Card className="block overflow-hidden border-border/60 shadow-sm">
              <div className="overflow-x-auto">
                <table role="table" className="w-full text-sm">
                  <thead className="bg-primary text-primary-foreground text-left text-xs uppercase tracking-wider sticky top-0 z-10">
                    <tr className="text-[11px] uppercase tracking-wider text-muted-foreground">
                      <th scope="col" className="px-4 py-3 font-semibold">Nº Chamado</th>
                      <th scope="col" className="px-4 py-3 font-semibold">Local</th>
                      <th scope="col" className="px-4 py-3 font-semibold">Descrição</th>
                      <th scope="col" className="px-4 py-3 font-semibold">Categoria</th>
                      <th scope="col" className="px-4 py-3 font-semibold">Responsável</th>
                      <th scope="col" className="px-4 py-3 font-semibold hidden lg:table-cell">Prioridade</th>
                      <th scope="col" className="px-4 py-3 font-semibold">Status</th>
                      <th scope="col" className="px-4 py-3 font-semibold hidden lg:table-cell">Dias</th>
                      <th scope="col" className="px-4 py-3 font-semibold">Agendado</th>
                      <th scope="col" className="px-4 py-3 font-semibold text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {isLoading && Array.from({ length: 6 }).map((_, i) => (
                      <tr key={i}>
                        {Array.from({ length: 10 }).map((_, j) => (
                          <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td>
                        ))}
                      </tr>
                    ))}
                    {!isLoading && filtered.length === 0 && (
                      <tr>
                        <td colSpan={10}>
                          <EmptyState
                            icon={ClipboardList}
                            title="Nenhum chamado encontrado"
                            description="Tente ajustar os filtros ou crie um novo chamado."
                            actionLabel="Nova manutenção"
                            actionTo="/manutencoes/nova"
                          />
                        </td>
                      </tr>
                    )}
                    {!isLoading && pagedItems.map(m => (
                      <tr key={m.id} className={`${priorityRowAccent(m)} hover:bg-muted/40 transition-colors group cursor-pointer`} onClick={() => setDrawer(m)}>
                        <td className="px-4 py-3 font-mono text-xs text-gold font-semibold whitespace-nowrap" onClick={e => e.stopPropagation()}>
                          <Link to="/manutencoes/$id" params={{ id: m.id }} className="hover:underline">{m.numero_chamado}</Link>
                        </td>
                        <td className="px-4 py-3 text-xs max-w-[160px]" title={localCompletoStr(m)} onClick={e => e.stopPropagation()}>
                          <Link to="/local/$local" params={{ local: m.local_manutencao }} className="hover:text-primary hover:underline truncate block">
                            {abreviarLocal(m)}
                          </Link>
                        </td>
                        <td className="px-4 py-3 max-w-xs">
                          <span className="line-clamp-2">{m.descricao}</span>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{m.categoria}</td>
                        {/* Coluna usa o campo legado `funcionario` para evitar N+1; a equipe completa aparece no drawer e no detalhe. */}
                        <td className="px-4 py-3 text-xs whitespace-nowrap" title="Abra o chamado para ver a equipe completa">
                          <ResponsavelChip m={m} />
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell"><PriorityBadge p={m.prioridade} /></td>
                        <td className="px-4 py-3"><StatusBadge status={m.status} /></td>
                        <td className="px-4 py-3 text-xs font-semibold whitespace-nowrap hidden lg:table-cell">
                          {isAtrasado(m) ? (
                            <span className="inline-flex items-center gap-1 text-rose-700">
                              <AlertTriangle className="h-3 w-3" />
                              {labelAtrasado(m)}
                            </span>
                          ) : isPrazoVencido(m) ? (
                            <span className="inline-flex items-center gap-1 text-yellow-700">
                              <Clock className="h-3 w-3" />
                              {labelPrazoVencido(m)}
                            </span>
                          ) : m.status === "Aguardando Aprovação" ? (
                            <span className="inline-flex items-center gap-1 text-amber-600">
                              <Clock className="h-3 w-3" />
                              {labelAguardando(m)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">{diasAberto(m)}d</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs whitespace-nowrap">
                          {(() => {
                            const cls = previstaCls(m.data_prevista);
                            const label = formatPrevista(m.data_prevista);
                            if (cls === "sem-data") return <span className="text-muted-foreground">—</span>;
                            if (cls === "atrasado") return <span className="text-[color:var(--danger)] font-semibold">⚠️ {label}</span>;
                            if (cls === "hoje") return <span className="text-[color:var(--warning)] font-semibold">🕐 {label}</span>;
                            return <span className="text-[color:var(--success)]">📅 {label}</span>;
                          })()}
                        </td>
                        <td className="px-4 py-3 no-print" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            {m.status === "Pendente" && (
                              <Button size="sm" variant="ghost" className="h-8 px-2 text-[color:var(--chart-3)] hover:bg-[color:var(--chart-3)]/10 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity" title="Iniciar serviço" onClick={() => setIniciando(m)}>
                                <Play className="h-3.5 w-3.5 mr-1" /> Iniciar
                              </Button>
                            )}
                            {m.status !== "Concluído" && m.status !== "Pendente" && (
                              <Button size="sm" variant="ghost" className="h-8 px-2 text-[color:var(--success)] hover:bg-[color:var(--success)]/10 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity" title="Concluir" onClick={() => setConcluding(m)}>
                                <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Concluir
                              </Button>
                            )}
                            <RowActions m={m} onView={() => setDrawer(m)} onEdit={() => setEditing(m)} onConclude={() => setConcluding(m)} onDelete={() => setDeleting(m)} onIniciar={() => setIniciando(m)} />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Pagination bar */}
              {!isLoading && filtered.length > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-border/60 bg-muted/20 text-xs text-muted-foreground">
                  <div>
                    Mostrando <span className="font-semibold text-foreground">{pageStart + 1}</span> a{" "}
                    <span className="font-semibold text-foreground">{pageEnd}</span> de{" "}
                    <span className="font-semibold text-foreground">{filtered.length}</span> resultados
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="icon" variant="outline" className="h-8 w-8" disabled={currentPage <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    {(() => {
                      const pages: number[] = [];
                      const start = Math.max(1, currentPage - 2);
                      const end = Math.min(totalPages, start + 4);
                      for (let i = start; i <= end; i++) pages.push(i);
                      return pages.map(p => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setPage(p)}
                          className={`h-8 min-w-8 px-2 rounded-md text-xs font-semibold transition-colors ${
                            p === currentPage ? "bg-primary text-primary-foreground shadow-sm" : "border border-border/70 hover:bg-muted"
                          }`}
                        >
                          {p}
                        </button>
                      ));
                    })()}
                    <Button size="icon" variant="outline" className="h-8 w-8" disabled={currentPage >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Select value={String(perPage)} onValueChange={(v) => { setPerPage(Number(v)); setPage(1); }}>
                      <SelectTrigger className="h-8 w-[130px] ml-2 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10 por página</SelectItem>
                        <SelectItem value="25">25 por página</SelectItem>
                        <SelectItem value="50">50 por página</SelectItem>
                        <SelectItem value="100">100 por página</SelectItem>
                        <SelectItem value="9999">Todos</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </Card>
          )}
        </>
      )}

      {/* DRAWER de detalhes */}
      <DetailDrawer m={drawer} onClose={() => setDrawer(null)} onEdit={(m) => { setDrawer(null); setEditing(m); }} onIniciar={(m) => setIniciando(m)} onConcluir={(m) => setConcluding(m)} onDelete={(m) => { setDrawer(null); setDeleting(m); }} />

      {/* Edit modal */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Chamado {editing?.numero_chamado}</DialogTitle>
            <DialogDescription>Atualize qualquer informação e clique em salvar.</DialogDescription>
          </DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div className="rounded-md border p-3 bg-muted/30 flex flex-wrap items-center gap-3">
                <label className="text-sm font-medium whitespace-nowrap">📅 Agendar para:</label>
                <input type="datetime-local"
                  className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                  defaultValue={editing.data_prevista ? new Date(new Date(editing.data_prevista).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ""}
                  onChange={(e) => {
                    if (!editing) return;
                    const val = e.target.value ? new Date(e.target.value).toISOString() : null;
                    supabase.from("manutencoes").update({ data_prevista: val } as never).eq("id", editing.id)
                      .then(({ error }) => {
                        if (!error) { invalidateAll(); toast.success("Agendamento salvo."); }
                        else toast.error("Não foi possível atualizar. Tente novamente.");
                      });
                  }} />
                <span className="text-xs text-muted-foreground">
                  {editing.data_prevista ? formatPrevista(editing.data_prevista) : "Sem agendamento"}
                </span>
              </div>
              <ManutencaoForm initial={editing} saving={updateMutation.isPending} allowedTorres={allowedTorres} onSubmit={(values) => updateMutation.mutateAsync({ id: editing.id, values })} />
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!concluding} onOpenChange={(o) => !o && setConcluding(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Concluir chamado?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja concluir este serviço? A data e hora serão registradas automaticamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-[color:var(--success)] text-white hover:bg-[color:var(--success)]/90"
              onClick={(e) => { e.preventDefault(); if (concluding) concludeMutation.mutate(concluding); }}>
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir chamado?</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza que deseja excluir este chamado? Esta ação não poderá ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => { e.preventDefault(); if (deleting) deleteMutation.mutate(deleting); }}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!iniciando} onOpenChange={(o) => !o && setIniciando(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Iniciar serviço?</AlertDialogTitle>
            <AlertDialogDescription>
              O chamado {iniciando?.numero_chamado} será movido para Em Andamento e a data de início registrada agora.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-[color:var(--chart-3)] text-white hover:bg-[color:var(--chart-3)]/90"
              onClick={(e) => { e.preventDefault(); if (iniciando) iniciarMutation.mutate(iniciando); }}>
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
        </div>

        {/* SIDEBAR DIREITO */}
        <aside className="hidden lg:block space-y-4 no-print">
          <Card className="p-4 border-border/60 shadow-sm bg-gradient-to-br from-card to-muted/20">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-gold font-bold">
                <Clock className="h-4 w-4" /> Hoje
              </div>
              <span className="text-[10px] text-muted-foreground">tempo real</span>
            </div>
            <div className="space-y-2.5">
              <SidebarStat dot="danger" label="Pendentes" value={hoje.pendentes} />
              <SidebarStat dot="info" label="Em andamento" value={hoje.andamento} />
              <SidebarStat dot="warning" label="Aguardando aprovação" value={hoje.aguardando} />
              <SidebarStat dot="success" label="Concluídos hoje" value={hoje.concluidosHoje} />
              <div className="h-px bg-border/60 my-1" />
              <SidebarStat icon={<User className="h-3.5 w-3.5" />} label="Funcionários trabalhando" value={hoje.funcionarios} />
              <SidebarStat icon={<Briefcase className="h-3.5 w-3.5" />} label="Prestadores ativos" value={hoje.prestadores} />
              <SidebarStat icon={<AlertTriangle className="h-3.5 w-3.5 text-[color:var(--danger)]" />} label="Chamados atrasados" value={counts.atrasados} />
              <SidebarStat icon={<AlertTriangle className="h-3.5 w-3.5 text-[color:var(--warning)]" />} label="Emergenciais" value={counts.emergenciais} />
            </div>
          </Card>

          <Card className="p-4 border-border/60 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-gold font-bold">
                <CalendarDays className="h-4 w-4" /> Agenda
              </div>
              <span className="text-[10px] text-muted-foreground">próximos serviços</span>
            </div>
            {agenda.length === 0 ? (
              <div className="py-4 text-center space-y-3">
                <div className="mx-auto h-12 w-12 grid place-items-center rounded-xl bg-muted text-muted-foreground">
                  <CalendarDays className="h-6 w-6" />
                </div>
                <p className="text-xs text-muted-foreground">Nenhum serviço agendado.</p>
                <Button variant="outline" size="sm" className="h-8 w-full text-xs" onClick={() => setFiltrosAbertos(true)}>
                  Ver calendário
                </Button>
              </div>
            ) : (
              <ul className="space-y-2">
                {agenda.map(({ m }) => {
                  const cls = previstaCls(m.data_prevista);
                  const tone = cls === "atrasado" ? "text-[color:var(--danger)]" : cls === "hoje" ? "text-[color:var(--warning)]" : "text-[color:var(--success)]";
                  const emoji = cls === "atrasado" ? "⚠️" : cls === "hoje" ? "🕐" : "📅";
                  return (
                    <li key={m.id}>
                      <button
                        type="button"
                        onClick={() => setDrawer(m)}
                        className="w-full text-left rounded-md border border-border/60 bg-card p-2 hover:bg-muted/40 transition-colors"
                      >
                        <div className={`text-[11px] font-semibold ${tone}`}>{emoji} {formatPrevista(m.data_prevista)}</div>
                        <div className="text-xs font-medium text-foreground truncate mt-0.5">{m.descricao}</div>
                        <div className="text-[10px] text-muted-foreground truncate">{abreviarLocal(m)}</div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          {/* ATENÇÃO — Atrasados */}
          {counts.atrasados > 0 && (
            <Card className="p-4 border-[color:var(--danger)]/30 shadow-sm bg-gradient-to-br from-[color:var(--danger)]/5 to-transparent">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-[color:var(--danger)] font-bold">
                  <AlertTriangle className="h-4 w-4" /> Atenção
                </div>
                <span className="h-5 min-w-[22px] px-1.5 rounded-full bg-[color:var(--danger)] text-white text-[10px] font-bold grid place-items-center">
                  {counts.atrasados}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                {counts.atrasados === 1 ? "Existe " : "Existem "}
                <span className="font-semibold text-foreground">{counts.atrasados}</span>{" "}
                {counts.atrasados === 1 ? "chamado atrasado" : "chamados atrasados"} com mais de 30 dias.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-full text-xs border-[color:var(--danger)]/40 text-[color:var(--danger)] hover:bg-[color:var(--danger)]/10"
                onClick={() => setFiltroEspecial("atrasado")}
              >
                Ver chamados atrasados
              </Button>
            </Card>
          )}
        </aside>
      </div>
    </div>
  );
}

/* ---------- KPI Card com sparkline ---------- */
function KpiCard({
  label, value, sub, icon, tone, active, onClick, spark, total,
}: {
  label: string; value: number; sub: string; icon: React.ReactNode;
  tone: "neutral" | "danger" | "info" | "warning" | "success";
  active?: boolean; onClick: () => void; spark: { d: string; v: number }[]; total?: number;
}) {
  const toneColor: Record<string, string> = {
    neutral: "var(--primary)",
    danger: "var(--danger)",
    info: "var(--chart-3)",
    warning: "var(--warning)",
    success: "var(--success)",
  };
  const color = toneColor[tone];
  const pct = total && total > 0 ? Math.round((value / total) * 100) : null;
  const gradId = `spark-${label.replace(/\s+/g, "")}`;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative text-left rounded-xl border bg-card p-3 sm:p-4 transition-all hover:-translate-y-0.5 hover:shadow-md ${active ? "border-[color:var(--gold)] shadow-md ring-1 ring-[color:var(--gold)]/40" : "border-border/60"}`}
    >
      <div className="flex items-center justify-between">
        <div className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
          <span className="grid place-items-center h-6 w-6 rounded-md" style={{ background: `color-mix(in oklab, ${color} 15%, transparent)`, color: `${color}` }}>{icon}</span>
          {label}
        </div>
        {pct !== null && <span className="text-[10px] font-semibold text-muted-foreground">{pct}%</span>}
      </div>
      <div className="mt-2 flex items-end justify-between gap-2">
        <div>
          <div className="text-2xl sm:text-3xl font-bold text-primary leading-none">{value}</div>
          <div className="text-[10px] text-muted-foreground mt-1">{sub}</div>
        </div>
        <div className="h-10 w-16 sm:w-20 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={spark}>
              <defs>
                <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.5} />
                  <stop offset="100%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area type="monotone" dataKey="v" stroke={color} strokeWidth={1.5} fill={`url(#${gradId})`} isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </button>
  );
}

function MiniStat({ label, value, dot, icon }: { label: string; value: number; dot?: "danger" | "info" | "warning" | "success"; icon?: React.ReactNode }) {
  const dotCls: Record<string, string> = {
    danger: "bg-[color:var(--danger)]",
    info: "bg-[color:var(--chart-3)]",
    warning: "bg-[color:var(--warning)]",
    success: "bg-[color:var(--success)]",
  };
  return (
    <div className="flex items-center gap-2 text-xs">
      {dot ? <span className={`h-2 w-2 rounded-full ${dotCls[dot]}`} /> : <span className="text-muted-foreground">{icon}</span>}
      <span className="text-muted-foreground">{label}</span>
      <span className="font-bold text-primary">{value}</span>
    </div>
  );
}

function SidebarStat({ label, value, dot, icon }: { label: string; value: number; dot?: "danger" | "info" | "warning" | "success"; icon?: React.ReactNode }) {
  const dotCls: Record<string, string> = {
    danger: "bg-[color:var(--danger)]",
    info: "bg-[color:var(--chart-3)]",
    warning: "bg-[color:var(--warning)]",
    success: "bg-[color:var(--success)]",
  };
  return (
    <div className="flex items-center justify-between gap-2 text-xs">
      <div className="flex items-center gap-2 min-w-0">
        {dot ? <span className={`h-2 w-2 rounded-full shrink-0 ${dotCls[dot]}`} /> : <span className="text-muted-foreground shrink-0">{icon}</span>}
        <span className="text-muted-foreground truncate">{label}</span>
      </div>
      <span className="font-bold text-primary tabular-nums">{value}</span>
    </div>
  );
}

/* ---------- Priority row accent ---------- */
function priorityRowAccent(m: Manutencao): string {
  if (isAtrasado(m)) return "border-l-4 border-red-500";
  if (isPrazoVencido(m)) return "border-l-2 border-yellow-400";
  if (m.status === "Concluído") return "border-l-4 border-l-[color:var(--success)]";
  if (m.prioridade === "Emergencial" || m.prioridade === "Alta") return "border-l-4 border-l-[color:var(--danger)]";
  if (m.prioridade === "Média") return "border-l-4 border-l-[color:var(--warning)]";
  if (m.prioridade === "Baixa") return "border-l-4 border-l-[color:var(--success)]";
  return "border-l-4 border-l-transparent";
}

/* ---------- Cards view ---------- */
function CardsView({
  items, isLoading, onOpen, onEdit, onIniciar, onConcluir, onDelete,
}: {
  items: Manutencao[]; isLoading: boolean;
  onOpen: (m: Manutencao) => void; onEdit: (m: Manutencao) => void; onIniciar: (m: Manutencao) => void;
  onConcluir: (m: Manutencao) => void; onDelete: (m: Manutencao) => void;
}) {
  if (isLoading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-xl" />)}
      </div>
    );
  }
  if (items.length === 0) {
    return (
      <Card className="rounded-[var(--radius-card)] shadow-[var(--shadow-card)]">
        <EmptyState
          icon={ClipboardList}
          title="Nenhum chamado encontrado"
          description="Tente ajustar os filtros ou crie um novo chamado."
          actionLabel="Nova manutenção"
          actionTo="/manutencoes/nova"
        />
      </Card>
    );
  }
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {items.map(m => {
        const atrasado = isAtrasado(m);
        const vencido = isPrazoVencido(m);
        const accent = atrasado
          ? "ring-2 ring-red-500/30 border-red-500/60 border-l-4 border-l-red-500"
          : vencido
            ? "border-yellow-400/60 border-l-2 border-l-yellow-400"
            : priorityRowAccent(m);
        return (
        <Card
          key={m.id}
          className={`p-4 ${accent} hover:shadow-md transition-all cursor-pointer group relative`}
          onClick={() => onOpen(m)}
        >
          {atrasado && (
            <div className="absolute -top-2 -right-2 z-10 inline-flex items-center gap-1 rounded-full bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 shadow-md">
              <AlertTriangle className="h-3 w-3" /> {labelAtrasado(m)}
            </div>
          )}
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="min-w-0">
              <div className="font-mono text-[11px] text-gold font-bold">{m.numero_chamado}</div>
              <div className="text-xs text-muted-foreground truncate" title={localCompletoStr(m)}>{abreviarLocal(m)}</div>
            </div>
            <div onClick={e => e.stopPropagation()}>
              <RowActions m={m} onView={() => onOpen(m)} onEdit={() => onEdit(m)} onConclude={() => onConcluir(m)} onDelete={() => onDelete(m)} onIniciar={() => onIniciar(m)} />
            </div>
          </div>
          <div className="text-sm font-medium text-foreground line-clamp-2 mb-3">{m.descricao}</div>
          <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
            <PriorityBadge p={m.prioridade} />
            <StatusBadge status={m.status} />
            <span className="text-[10px] text-muted-foreground">{m.categoria}</span>
          </div>
          {m.status === "Aguardando Aprovação" && (
            <div className="mb-3 inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-600">
              <Clock className="h-3 w-3" />
              {labelAguardando(m)}
            </div>
          )}
          {vencido && (
            <div className="mb-3 inline-flex items-center gap-1 rounded-full border border-yellow-400/40 bg-yellow-400/10 px-2 py-0.5 text-[10px] font-semibold text-yellow-700">
              <Clock className="h-3 w-3" />
              {labelPrazoVencido(m)}
            </div>
          )}
          {atrasado && (
            <div className="mb-3 inline-flex items-center gap-1 rounded-full border border-red-500/40 bg-red-500/10 px-2 py-0.5 text-[10px] font-semibold text-rose-700">
              <AlertTriangle className="h-3 w-3" />
              {labelAtrasado(m)}
            </div>
          )}
          {m.status !== "Aguardando Aprovação" && !vencido && !atrasado && <div className="mb-3" />}
          <div className="flex items-center justify-between border-t border-border/60 pt-2 text-xs">
            <ResponsavelChip m={m} />
            <div className={`font-semibold ${isAtrasado(m) ? "text-[color:var(--danger)]" : "text-muted-foreground"}`}>{diasAberto(m)}d</div>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5" onClick={e => e.stopPropagation()}>
            {m.status === "Pendente" && (
              <Button size="sm" variant="outline" className="h-7 text-xs text-[color:var(--chart-3)] border-[color:var(--chart-3)]/40" onClick={() => onIniciar(m)}>
                <Play className="h-3 w-3 mr-1" /> Iniciar
              </Button>
            )}
            {m.status !== "Concluído" && m.status !== "Pendente" && (
              <Button size="sm" variant="outline" className="h-7 text-xs text-[color:var(--success)] border-[color:var(--success)]/40" onClick={() => onConcluir(m)}>
                <CheckCircle2 className="h-3 w-3 mr-1" /> Concluir
              </Button>
            )}
            <Button size="sm" variant="ghost" className="h-7 text-xs ml-auto" onClick={() => onOpen(m)}>
              Ver detalhes <ChevronRight className="h-3 w-3 ml-1" />
            </Button>
          </div>
        </Card>
        );
      })}
    </div>
  );
}

/* ---------- Responsável chip ---------- */
function ResponsavelChip({ m }: { m: Manutencao }) {
  const isPrestador = !!m.prestador_id || !!m.prestador_responsavel;
  const nome = isPrestador ? (m.prestador_responsavel ?? "Prestador") : (m.funcionario ?? "—");
  const initials = nome && nome !== "—" ? nome.split(/\s+/).map(p => p[0]).slice(0, 2).join("").toUpperCase() : "?";
  return (
    <div className="inline-flex items-center gap-2 min-w-0">
      <span className={`h-6 w-6 grid place-items-center rounded-full text-[10px] font-bold shrink-0 ${isPrestador ? "bg-[color:var(--chart-3)]/15 text-[color:var(--chart-3)]" : "bg-gold/15 text-gold"}`}>
        {initials}
      </span>
      <span className="truncate max-w-[140px]">
        <span className="mr-1">{isPrestador ? "🏢" : "👷"}</span>
        {nome}
      </span>
    </div>
  );
}

/* ---------- Detail Drawer ---------- */
const MAX_DRAWER = 3;

function EquipeDrawer({ m, nomes }: { m: Manutencao; nomes: string[] }) {
  const isPrestador = !!m.prestador_id || !!m.prestador_responsavel;
  if (isPrestador || nomes.length === 0) return <ResponsavelChip m={m} />;
  const visiveis = nomes.slice(0, MAX_DRAWER);
  const resto = nomes.length - MAX_DRAWER;
  return (
    <div className="flex flex-wrap gap-1.5">
      {visiveis.map(n => (
        <span key={n} className="inline-flex items-center gap-1 rounded-full border border-gold/40 bg-gold/10 px-2 py-0.5 text-[11px] font-medium text-primary">
          <HardHat className="h-3 w-3 text-gold" /> {n}
        </span>
      ))}
      {resto > 0 && <span className="text-[11px] text-muted-foreground self-center">+{resto} mais</span>}
    </div>
  );
}

function DetailDrawer({
  m, onClose, onEdit, onIniciar, onConcluir, onDelete,
}: {
  m: Manutencao | null; onClose: () => void;
  onEdit: (m: Manutencao) => void; onIniciar: (m: Manutencao) => void; onConcluir: (m: Manutencao) => void; onDelete: (m: Manutencao) => void;
}) {
  const { equipe } = useEquipe(m?.id ?? null);
  const nomesDrawer = m ? nomesEquipe(m, equipe) : [];
  return (
    <Sheet open={!!m} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        {m && (
          <>
            <SheetHeader>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-mono text-xs text-gold font-bold">{m.numero_chamado} · OS {m.numero_os}</div>
                  <SheetTitle className="text-lg font-display truncate">{m.descricao.slice(0, 80)}{m.descricao.length > 80 ? "…" : ""}</SheetTitle>
                  <SheetDescription className="flex flex-wrap gap-2 pt-1">
                    <StatusBadge status={m.status} />
                    <PriorityBadge p={m.prioridade} />
                    <span className="text-xs text-muted-foreground">{m.categoria}</span>
                  </SheetDescription>
                </div>
              </div>
            </SheetHeader>

            <div className="mt-4 space-y-5 text-sm">
              <section className="grid grid-cols-2 gap-3">
                <MiniField label="Local" value={<span className="inline-flex items-center gap-1"><Building2 className="h-3 w-3" />{localLabel(m)}</span>} />
                <MiniField label={nomesDrawer.length > 1 ? "Equipe Responsável" : "Responsável"} value={<EquipeDrawer m={m} nomes={nomesDrawer} />} />
                <MiniField label="Vistoria" value={formatDate(m.data_vistoria)} />
                <MiniField label="Início" value={formatDate(m.data_inicio)} />
                <MiniField label="Conclusão" value={formatDate(m.data_conclusao)} />
                <MiniField label="Agendado" value={m.data_prevista ? formatPrevista(m.data_prevista) : "—"} />
              </section>

              {m.observacao && (
                <section>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-1">Observações</div>
                  <p className="text-sm text-foreground whitespace-pre-wrap">{m.observacao}</p>
                </section>
              )}

              {(m.foto_antes?.length > 0 || m.foto_depois?.length > 0) && (
                <section className="grid grid-cols-2 gap-3">
                  <PhotoBlock title="📸 Antes" items={m.foto_antes ?? []} />
                  <PhotoBlock title="📸 Depois" items={m.foto_depois ?? []} />
                </section>
              )}

              <section>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-2">Timeline</div>
                <TimelineServico events={m.timeline_events ?? []} readOnly />
              </section>

              <section className="flex flex-wrap gap-2 pt-2 border-t border-border/60">
                <Button size="sm" onClick={() => onEdit(m)}><Pencil className="h-3.5 w-3.5 mr-1" /> Editar</Button>
                {m.status === "Pendente" && (
                  <Button size="sm" variant="outline" className="text-[color:var(--chart-3)] border-[color:var(--chart-3)]/40" onClick={() => onIniciar(m)}>
                    <Play className="h-3.5 w-3.5 mr-1" /> Iniciar
                  </Button>
                )}
                {m.status !== "Concluído" && m.status !== "Pendente" && (
                  <Button size="sm" variant="outline" className="text-[color:var(--success)] border-[color:var(--success)]/40" onClick={() => onConcluir(m)}>
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Concluir
                  </Button>
                )}
                <Link to="/manutencoes/os/$id" params={{ id: m.id }} className="inline-flex items-center gap-1 h-8 px-3 rounded-md bg-gold text-gold-foreground text-xs font-semibold hover:opacity-90">
                  <FileText className="h-3.5 w-3.5" /> Imprimir OS
                </Link>
                <Link to="/manutencoes/$id" params={{ id: m.id }} className="inline-flex items-center gap-1 h-8 px-3 rounded-md border text-xs hover:bg-muted">
                  Abrir página completa <ChevronRight className="h-3 w-3" />
                </Link>
                <Button size="sm" variant="outline" className="ml-auto text-destructive border-destructive/40" onClick={() => onDelete(m)}>
                  <Trash2 className="h-3.5 w-3.5 mr-1" /> Excluir
                </Button>
              </section>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function MiniField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="border-l-2 border-gold pl-2">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</div>
      <div className="text-sm font-medium text-foreground">{value}</div>
    </div>
  );
}

function PhotoBlock({ title, items }: { title: string; items: { path: string; name: string }[] }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-1">{title}</div>
      {items.length === 0 ? (
        <div className="h-24 grid place-items-center border-2 border-dashed rounded text-[10px] text-muted-foreground">Sem fotos</div>
      ) : (
        <div className="grid grid-cols-2 gap-1">
          {items.slice(0, 4).map(f => (
            <SignedImage key={f.path} path={f.path} className="w-full h-20 object-cover rounded border" />
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------- Concluídos table ---------- */
function ConcluidosTable({
  items, isLoading, onEdit, onDelete, onView,
}: {
  items: Manutencao[]; isLoading: boolean;
  onEdit: (m: Manutencao) => void; onDelete: (m: Manutencao) => void; onView: (m: Manutencao) => void;
}) {
  return (
    <Card className="overflow-hidden border-border/60 shadow-sm">
      <div className="overflow-x-auto">
        <table role="table" className="w-full text-sm">
          <thead className="bg-primary text-primary-foreground text-left text-xs uppercase tracking-wider">
            <tr className="text-[11px] uppercase tracking-wider text-muted-foreground">
              <th scope="col" className="px-4 py-3 font-semibold">Nº Chamado</th>
              <th scope="col" className="px-4 py-3 font-semibold">Torre</th>
              <th scope="col" className="px-4 py-3 font-semibold">Local</th>
              <th scope="col" className="px-4 py-3 font-semibold">Responsável</th>
              <th scope="col" className="px-4 py-3 font-semibold">Abertura</th>
              <th scope="col" className="px-4 py-3 font-semibold">Conclusão</th>
              <th scope="col" className="px-4 py-3 font-semibold">Antes</th>
              <th scope="col" className="px-4 py-3 font-semibold">Depois</th>
              <th scope="col" className="px-4 py-3 font-semibold text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {isLoading && Array.from({ length: 4 }).map((_, i) => (
              <tr key={i}>{Array.from({ length: 9 }).map((_, j) => <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td>)}</tr>
            ))}
            {!isLoading && items.length === 0 && (
              <tr><td colSpan={9}><EmptyState icon={ClipboardList} title="Nenhum chamado concluído" description="Os chamados finalizados aparecerão aqui." /></td></tr>
            )}
            {items.map(m => {
              const torreLabel = m.local_manutencao === "Geral" ? "Geral" : nomeTorre(m.local_manutencao);
              return (
                <tr key={m.id} className="border-l-4 border-l-[color:var(--success)] hover:bg-muted/50 cursor-pointer" onClick={() => onView(m)}>
                  <td className="px-4 py-3 font-mono text-xs text-gold font-semibold whitespace-nowrap" onClick={e => e.stopPropagation()}>
                    <Link to="/manutencoes/$id" params={{ id: m.id }} className="hover:underline">{m.numero_chamado}</Link>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">{torreLabel}</td>
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                    <Link to="/local/$local" params={{ local: m.local_manutencao }} className="hover:text-primary hover:underline">
                      {localLabel(m)}
                    </Link>
                  </td>
                  <td className="px-4 py-3"><ResponsavelChip m={m} /></td>
                  <td className="px-4 py-3 text-xs whitespace-nowrap">{formatDate(m.created_at)}</td>
                  <td className="px-4 py-3 text-xs whitespace-nowrap">{formatDateTime(m.data_conclusao)}</td>
                  <td className="px-4 py-3"><PhotoThumbs paths={(m.foto_antes ?? []).map(f => f.path)} /></td>
                  <td className="px-4 py-3"><PhotoThumbs paths={(m.foto_depois ?? []).map(f => f.path)} /></td>
                  <td className="px-4 py-3 no-print" onClick={e => e.stopPropagation()}>
                    <div className="flex justify-end gap-1.5">
                      <Button size="sm" variant="outline" className="h-8 border-primary/40 text-primary hover:bg-primary/10" onClick={() => onEdit(m)} title="Editar">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="outline" className="h-8 border-destructive/40 text-destructive hover:bg-destructive/10" onClick={() => onDelete(m)} title="Excluir">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function PhotoThumbs({ paths }: { paths: string[] }) {
  if (!paths || paths.length === 0) return <span className="text-xs text-muted-foreground">—</span>;
  const show = paths.slice(0, 3);
  return (
    <div className="flex -space-x-2">
      {show.map((p) => (
        <SignedImage key={p} path={p} className="h-10 w-10 rounded border-2 border-card object-cover" />
      ))}
      {paths.length > 3 && (
        <span className="h-10 w-10 rounded border-2 border-card bg-muted grid place-items-center text-[11px] font-semibold">+{paths.length - 3}</span>
      )}
    </div>
  );
}

function RowActions({
  m, onView, onEdit, onConclude, onDelete, onIniciar,
}: {
  m: Manutencao;
  onView: () => void;
  onEdit: () => void;
  onConclude: () => void;
  onDelete: () => void;
  onIniciar: () => void;
}) {
  const isConcluded = m.status === "Concluído";
  return (
    <div className="flex justify-end">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="icon" variant="ghost" className="h-8 w-8">
            <MoreVertical className="h-4 w-4" />
            <span className="sr-only">Ações</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onView}><Eye className="h-4 w-4 mr-2" /> Visualizar</DropdownMenuItem>
          <DropdownMenuItem onClick={onEdit}><Pencil className="h-4 w-4 mr-2 text-primary" /> Editar</DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link to="/manutencoes/$id" params={{ id: m.id }}>
              <FileText className="h-4 w-4 mr-2" /> Adicionar Fotos / Detalhes
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link to="/manutencoes/os/$id" params={{ id: m.id }}>
              <Printer className="h-4 w-4 mr-2" /> Imprimir OS
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {m.status === "Pendente" && (
            <DropdownMenuItem onClick={onIniciar}>
              <Play className="h-4 w-4 mr-2 text-[color:var(--chart-3)]" /> Iniciar
            </DropdownMenuItem>
          )}
          {!isConcluded && (
            <DropdownMenuItem onClick={onConclude}>
              <CheckCircle2 className="h-4 w-4 mr-2 text-[color:var(--success)]" /> Concluir
            </DropdownMenuItem>
          )}
          {isConcluded && (
            <DropdownMenuItem disabled>
              <CheckCircle2 className="h-4 w-4 mr-2 text-[color:var(--success)]" />
              Concluído em {formatDateTime(m.data_conclusao)}
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
            <Trash2 className="h-4 w-4 mr-2" /> Excluir
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function PriorityBadge({ p }: { p: string }) {
  const cls = p === "Emergencial" ? "bg-[color:var(--danger)]/15 text-[color:var(--danger)] border-[color:var(--danger)]/30"
    : p === "Alta" ? "bg-[color:var(--warning)]/15 text-[color:var(--warning)] border-[color:var(--warning)]/30"
    : p === "Média" ? "bg-[color:var(--chart-3)]/15 text-[color:var(--chart-3)] border-[color:var(--chart-3)]/30"
    : "bg-muted text-muted-foreground border-border";
  return <span className={`inline-block text-[11px] px-2 py-0.5 rounded border ${cls}`}>{p}</span>;
}

function StatusBadge({ status }: { status: string }) {
  return <span className={`inline-block text-[11px] px-2 py-0.5 rounded border ${statusBadgeClasses(status)}`}>{status}</span>;
}

/* ---------- Estatísticas por Torre ---------- */
type TorreStatCard = {
  id: string;
  nome: string;
  pendente: number;
  andamento: number;
  aguardando: number;
  concluido: number;
  emergencial: number;
  atrasado: number;
  total: number;
};

function TorresStatsGrid({
  stats, activeTorre, onSelect,
}: {
  stats: TorreStatCard[];
  activeTorre?: string;
  onSelect: (t: string) => void;
}) {
  return (
    <section className="no-print space-y-2">
      <div className="flex items-center gap-2 px-1">
        <Building2 className="h-4 w-4 text-gold" />
        <h2 className="text-xs uppercase tracking-[0.2em] text-gold font-bold">Estatísticas por Torre</h2>
        {activeTorre && (
          <button
            type="button"
            className="ml-auto text-xs text-primary hover:underline"
            onClick={() => onSelect(activeTorre)}
          >
            × Limpar seleção
          </button>
        )}
      </div>
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4">
        {stats.map(s => (
          <TorreStatCardEl key={s.id} s={s} active={activeTorre === s.id} onSelect={() => onSelect(s.id)} />
        ))}
      </div>
    </section>
  );
}

function TorreStatCardEl({ s, active, onSelect }: { s: TorreStatCard; active: boolean; onSelect: () => void }) {
  const isGeral = s.id === "Geral";
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`text-left rounded-xl border bg-card p-3 transition-all hover:-translate-y-0.5 hover:shadow-md ${
        active ? "border-[color:var(--gold)] shadow-md ring-1 ring-[color:var(--gold)]/40" : "border-border/60"
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
            {isGeral ? "Geral" : s.id}
          </div>
          <div className="font-display text-sm font-bold text-primary truncate">{s.nome}</div>
        </div>
        <span className={`h-8 w-8 grid place-items-center rounded-lg text-[11px] font-bold ${
          isGeral ? "bg-[color:var(--chart-3)]/15 text-[color:var(--chart-3)]" : "bg-gold/15 text-gold"
        }`}>
          {isGeral ? "AC" : s.id.replace("Torre ", "")}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-1.5 text-[11px]">
        <TorreStatChip label="Pendentes" value={s.pendente} tone="danger" emoji="🔴" />
        <TorreStatChip label="Em and." value={s.andamento} tone="info" emoji="🔵" />
        <TorreStatChip label="Aguard." value={s.aguardando} tone="warning" emoji="🟡" />
        <TorreStatChip label="Concl." value={s.concluido} tone="success" emoji="🟢" />
        <TorreStatChip label="Emerg." value={s.emergencial} tone="danger" emoji="🚨" />
        <TorreStatChip label="Atrasad." value={s.atrasado} tone="warning" emoji="⏰" />
      </div>
      <div className="mt-2 pt-2 border-t border-border/60 flex items-center justify-between text-[10px] text-muted-foreground">
        <span>Total</span>
        <span className="font-bold text-primary tabular-nums">{s.total}</span>
      </div>
    </button>
  );
}

function TorreStatChip({ label, value, tone, emoji }: { label: string; value: number; tone: "danger" | "info" | "warning" | "success"; emoji: string }) {
  const toneCls: Record<string, string> = {
    danger: "bg-[color:var(--danger)]/8 text-[color:var(--danger)]",
    info: "bg-[color:var(--chart-3)]/8 text-[color:var(--chart-3)]",
    warning: "bg-[color:var(--warning)]/8 text-[color:var(--warning)]",
    success: "bg-[color:var(--success)]/8 text-[color:var(--success)]",
  };
  return (
    <div className={`rounded-md px-1.5 py-1 ${toneCls[tone]}`}>
      <div className="flex items-center gap-1 leading-none">
        <span className="text-[10px]">{emoji}</span>
        <span className="font-bold tabular-nums text-[13px]">{value}</span>
      </div>
      <div className="text-[9px] opacity-80 mt-0.5">{label}</div>
    </div>
  );
}

/* ---------- Dashboard da Torre ---------- */
type TorreDashData = {
  inTorre: Manutencao[];
  ativos: number;
  funcionarios: string[];
  prestadores: string[];
  ultimos: Manutencao[];
  pendentesTop: Manutencao[];
  emergTop: Manutencao[];
};

function TorreDashboardPanel({
  torre, dash, onClear, onOpen,
}: {
  torre: string;
  dash: TorreDashData;
  onClear: () => void;
  onOpen: (m: Manutencao) => void;
}) {
  const label = torre === "Geral" ? "Áreas Comuns" : nomeTorre(torre);
  return (
    <Card className="p-4 sm:p-5 border-[color:var(--gold)]/40 shadow-sm bg-gradient-to-br from-card via-card to-gold/5 no-print">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div className="flex items-start gap-3 min-w-0">
          <div className="h-11 w-11 grid place-items-center rounded-xl bg-gold/15 text-gold shrink-0">
            <Building2 className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-[0.2em] text-gold font-bold">Dashboard</div>
            <h2 className="font-display text-xl font-bold text-primary truncate">{label}</h2>
            <p className="text-xs text-muted-foreground">
              {dash.inTorre.length} chamado(s) no total · {dash.ativos} ativos
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" className="h-8" onClick={onClear}>
          <X className="h-3.5 w-3.5 mr-1" /> Fechar
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {/* Funcionários / Prestadores */}
        <div className="space-y-3">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-1.5 flex items-center gap-1.5">
              <User className="h-3 w-3" /> Funcionários atuando
            </div>
            {dash.funcionarios.length === 0 ? (
              <div className="text-xs text-muted-foreground">Nenhum</div>
            ) : (
              <div className="flex flex-wrap gap-1">
                {dash.funcionarios.slice(0, 6).map(f => (
                  <span key={f} className="inline-flex items-center gap-1 text-[11px] bg-gold/10 text-gold border border-gold/30 rounded px-1.5 py-0.5">
                    👷 {f}
                  </span>
                ))}
                {dash.funcionarios.length > 6 && (
                  <span className="text-[11px] text-muted-foreground">+{dash.funcionarios.length - 6}</span>
                )}
              </div>
            )}
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-1.5 flex items-center gap-1.5">
              <Briefcase className="h-3 w-3" /> Prestadores atuando
            </div>
            {dash.prestadores.length === 0 ? (
              <div className="text-xs text-muted-foreground">Nenhum</div>
            ) : (
              <div className="flex flex-wrap gap-1">
                {dash.prestadores.slice(0, 6).map(p => (
                  <span key={p} className="inline-flex items-center gap-1 text-[11px] bg-[color:var(--chart-3)]/10 text-[color:var(--chart-3)] border border-[color:var(--chart-3)]/30 rounded px-1.5 py-0.5">
                    🏢 {p}
                  </span>
                ))}
                {dash.prestadores.length > 6 && (
                  <span className="text-[11px] text-muted-foreground">+{dash.prestadores.length - 6}</span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Últimos serviços */}
        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-1.5">Últimos serviços</div>
          {dash.ultimos.length === 0 ? (
            <div className="text-xs text-muted-foreground">Nenhum</div>
          ) : (
            <ul className="space-y-1.5">
              {dash.ultimos.map(m => (
                <li key={m.id}>
                  <button type="button" onClick={() => onOpen(m)} className="w-full text-left rounded-md border border-border/60 bg-background p-2 hover:bg-muted/40 transition-colors">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-[10px] text-gold font-bold">{m.numero_chamado}</span>
                      <StatusBadge status={m.status} />
                    </div>
                    <div className="text-xs text-foreground truncate mt-0.5">{m.descricao}</div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Pendentes + Emergenciais */}
        <div className="space-y-3">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-[color:var(--danger)] font-bold mb-1.5 flex items-center gap-1.5">
              <PauseCircle className="h-3 w-3" /> Pendentes
            </div>
            {dash.pendentesTop.length === 0 ? (
              <div className="text-xs text-muted-foreground">Nenhum</div>
            ) : (
              <ul className="space-y-1">
                {dash.pendentesTop.map(m => (
                  <li key={m.id}>
                    <button type="button" onClick={() => onOpen(m)} className="w-full text-left text-xs hover:text-primary hover:underline">
                      <span className="font-mono text-[10px] text-gold mr-1">{m.numero_chamado}</span>
                      {m.descricao.slice(0, 40)}{m.descricao.length > 40 ? "…" : ""}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-[color:var(--danger)] font-bold mb-1.5 flex items-center gap-1.5">
              <AlertTriangle className="h-3 w-3" /> Emergenciais
            </div>
            {dash.emergTop.length === 0 ? (
              <div className="text-xs text-muted-foreground">Nenhum</div>
            ) : (
              <ul className="space-y-1">
                {dash.emergTop.map(m => (
                  <li key={m.id}>
                    <button type="button" onClick={() => onOpen(m)} className="w-full text-left text-xs hover:text-primary hover:underline">
                      <span className="font-mono text-[10px] text-gold mr-1">{m.numero_chamado}</span>
                      {m.descricao.slice(0, 40)}{m.descricao.length > 40 ? "…" : ""}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

void STATUSES;
void STATUS_ATIVOS;

