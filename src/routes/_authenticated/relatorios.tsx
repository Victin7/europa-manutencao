import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  CATEGORIAS, STATUSES, TORRES, AREAS_COMUNS, type Manutencao, formatDate, formatDateTime, nomeTorre, unidadesDaTorre, subtiposDaTorre, TODOS_SUBTIPOS_TORRE, localLabel, fetchManutencoes,
  parseDateOnly,
} from "@/lib/manutencoes";
import { listAtivos, ativoLabel, type Ativo } from "@/lib/ativos";

import { FileSpreadsheet, Printer, Building2, Package, CalendarClock, BarChart3 } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { TableSkeleton } from "@/components/TableSkeleton";
import { useAllowedTorres } from "@/hooks/use-role";
import * as XLSX from "xlsx";
import { fallback, zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";

type Aba = "geral" | "ativo" | "preventivas";

const searchSchema = z.object({
  tipo: fallback(z.enum(["mes", "ano", "custom"]), "custom").default("custom"),
  aba: fallback(z.enum(["geral", "ativo", "preventivas"]), "geral").default("geral"),
  ativoId: fallback(z.string(), "").default(""),
});

export const Route = createFileRoute("/_authenticated/relatorios")({
  validateSearch: zodValidator(searchSchema),
  component: RelatoriosShell,
});

function RelatoriosShell() {
  const { aba } = Route.useSearch();
  const navigate = useNavigate({ from: "/relatorios" });
  return (
    <div className="max-w-[1200px] mx-auto space-y-4">
      <div className="no-print inline-flex rounded-xl border bg-card p-1 gap-1">
        {([
          { id: "geral", label: "Geral", icon: FileSpreadsheet },
          { id: "ativo", label: "Por Ativo", icon: Package },
          { id: "preventivas", label: "Preventivas", icon: CalendarClock },
        ] as const).map(t => {
          const active = aba === t.id;
          return (
            <button
              key={t.id}
              onClick={() => navigate({ search: (p: { tipo?: string; aba?: string; ativoId?: string }) => ({ ...p, aba: t.id }) })}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
              }`}
            >
              <t.icon className="h-4 w-4" />
              {t.label}
            </button>
          );
        })}
      </div>
      {aba === "geral" && <RelatoriosPage />}
      {aba === "ativo" && <RelatorioPorAtivo />}
      {aba === "preventivas" && <RelatorioPreventivas />}
    </div>
  );
}

function RelatoriosPage() {
  const { tipo } = Route.useSearch();
  const allowedTorres = useAllowedTorres();
  const torresVisiveis = allowedTorres ? TORRES.filter(t => allowedTorres.includes(t.id)) : TORRES;
  const { data: items = [], isLoading } = useQuery({
    queryKey: ["manutencoes"],
    queryFn: fetchManutencoes,
  });

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [funcionario, setFuncionario] = useState("");
  const [categoria, setCategoria] = useState("all");
  const [status, setStatus] = useState("all");
  const [local, setLocal] = useState("all");
  const [unidade, setUnidade] = useState("all");
  const [subtipo, setSubtipo] = useState("all"); // subtipo dentro de torre (Apartamento, Hall Social, ..., SS2 - Hall Social, ...)
  const [areaComum, setAreaComum] = useState("all");


  useEffect(() => {
    const now = new Date();
    if (tipo === "mes") {
      const first = new Date(now.getFullYear(), now.getMonth(), 1);
      setFrom(first.toISOString().slice(0, 10));
      setTo(now.toISOString().slice(0, 10));
    } else if (tipo === "ano") {
      const first = new Date(now.getFullYear(), 0, 1);
      setFrom(first.toISOString().slice(0, 10));
      setTo(now.toISOString().slice(0, 10));
    }
  }, [tipo]);

  // Reset dependent filters when local changes
  useEffect(() => {
    setUnidade("all");
    setSubtipo("all");
    setAreaComum("all");
  }, [local]);

  const isGeral = local === "Geral";
  const isTorre = local !== "all" && local !== "Geral";
  const unidadesOpts = useMemo(() => isTorre ? unidadesDaTorre(local) : [], [isTorre, local]);
  const subtipoOpts = useMemo(() => {
    if (isTorre) return subtiposDaTorre(local);
    if (local === "all") return [...TODOS_SUBTIPOS_TORRE];
    return [];
  }, [isTorre, local]);

  // Busca a equipe em bulk apenas quando o filtro de funcionário está ativo (evita N+1)
  const { data: todasEquipes = [] } = useQuery({
    queryKey: ["todas-equipes"],
    queryFn: async () => {
      const { data } = await supabase.from("manutencao_equipe").select("manutencao_id, nome_funcionario");
      return (data ?? []) as { manutencao_id: string; nome_funcionario: string }[];
    },
    enabled: !!funcionario,
  });

  const filtered = useMemo(() => {
    const termoFunc = funcionario.trim().toLowerCase();
    return items.filter(m => {
      if (from && new Date(m.created_at) < new Date(from)) return false;
      if (to && new Date(m.created_at) > new Date(to + "T23:59:59")) return false;
      if (termoFunc) {
        const noLegado = (m.funcionario ?? "").toLowerCase().includes(termoFunc);
        const naEquipe = todasEquipes.some(
          e => e.manutencao_id === m.id && e.nome_funcionario.toLowerCase().includes(termoFunc),
        );
        if (!noLegado && !naEquipe) return false;
      }
      if (categoria !== "all" && m.categoria !== categoria) return false;
      if (status !== "all" && m.status !== status) return false;
      if (local !== "all" && m.local_manutencao !== local) return false;
      if (isTorre && subtipo !== "all" && m.area_comum !== subtipo) return false;
      if (isTorre && unidade !== "all" && m.unidade !== unidade) return false;
      if (isGeral && areaComum !== "all" && m.area_comum !== areaComum) return false;
      return true;
    });
  }, [items, from, to, funcionario, todasEquipes, categoria, status, local, subtipo, unidade, areaComum, isGeral, isTorre]);


  function exportExcel() {
    const rows = filtered.map(m => ({
      "Nº Chamado": m.numero_chamado, "Nº OS": m.numero_os,
      Local: m.local_manutencao, Torre: m.torre ?? "", Unidade: m.unidade ?? "", "Área Comum": m.area_comum ?? "",
      Categoria: m.categoria, Prioridade: m.prioridade, Status: m.status, Funcionário: m.funcionario ?? "",
      Vistoria: formatDate(m.data_vistoria), Início: formatDate(m.data_inicio),
      Conclusão: formatDate(m.data_conclusao),
      Descrição: m.descricao, Observação: m.observacao ?? "",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Relatório");
    XLSX.writeFile(wb, `relatorio-manutencoes-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  const titulo = tipo === "mes" ? "Relatório Mensal" : tipo === "ano" ? "Relatório Anual" : "Relatório de Manutenções";
  const pendentes = filtered.filter(m => m.status === "Pendente").length;
  const andamento = filtered.filter(m => m.status === "Em Andamento").length;
  const concluidos = filtered.filter(m => m.status === "Concluído").length;

  return (
    <div className="max-w-[1200px] mx-auto space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3 no-print">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-gold">Gestão</div>
          <h1 className="font-display text-3xl font-bold text-primary">{titulo}</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportExcel}><FileSpreadsheet className="h-4 w-4 mr-2" /> Excel</Button>
          <Button onClick={() => window.print()} className="bg-primary"><Printer className="h-4 w-4 mr-2" /> Imprimir / PDF</Button>
        </div>
      </header>

      <Card className="p-4 no-print">
        <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-3">
          <div className="space-y-1"><Label className="text-xs">De</Label><Input type="date" value={from} onChange={e => setFrom(e.target.value)} /></div>
          <div className="space-y-1"><Label className="text-xs">Até</Label><Input type="date" value={to} onChange={e => setTo(e.target.value)} /></div>
          <div className="space-y-1"><Label className="text-xs">Local</Label>
            <Select value={local} onValueChange={setLocal}><SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="Geral">Geral (Áreas Comuns)</SelectItem>
                {torresVisiveis.map(t => <SelectItem key={t.id} value={t.id}>{t.id} – {t.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {isTorre && (
            <>
              <div className="space-y-1"><Label className="text-xs">Subtipo</Label>
                <Select value={subtipo} onValueChange={setSubtipo}><SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {subtipoOpts.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {subtipo === "Apartamento" && (
                <div className="space-y-1"><Label className="text-xs">Apartamento</Label>
                  <Select value={unidade} onValueChange={setUnidade}><SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent className="max-h-72">
                      <SelectItem value="all">Todos</SelectItem>
                      {unidadesOpts.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </>
          )}
          {isGeral && (
            <div className="space-y-1"><Label className="text-xs">Área Comum</Label>
              <Select value={areaComum} onValueChange={setAreaComum}><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {AREAS_COMUNS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1"><Label className="text-xs">Funcionário</Label><Input value={funcionario} onChange={e => setFuncionario(e.target.value)} /></div>
          <div className="space-y-1"><Label className="text-xs">Categoria</Label>
            <Select value={categoria} onValueChange={setCategoria}><SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="all">Todas</SelectItem>{CATEGORIAS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1"><Label className="text-xs">Status</Label>
            <Select value={status} onValueChange={setStatus}><SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="all">Todos</SelectItem>{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      <Separator className="my-8 no-print" />

      <Card className="p-8 print-page bg-white text-black">

        <header className="flex items-center justify-between border-b-2 border-primary pb-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="h-14 w-14 rounded bg-primary grid place-items-center text-primary-foreground">
              <Building2 className="h-8 w-8" />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-[0.25em] text-[color:var(--gold)] font-bold">Condomínio Europa</div>
              <div className="font-display text-2xl font-bold text-primary leading-tight">Controle de Manutenção</div>
              <div className="text-xs text-muted-foreground">{titulo}</div>
            </div>
          </div>
          <div className="text-right text-xs">
            <div className="font-semibold">Emitido em {formatDateTime(new Date().toISOString())}</div>
            <div className="text-muted-foreground">
              {from && `De ${formatDate(from)} `}{to && `até ${formatDate(to)}`}
            </div>
            {local !== "all" && <div className="text-muted-foreground">Local: {local === "Geral" ? "Geral" : nomeTorre(local)}</div>}
          </div>
        </header>

        <div className="grid grid-cols-4 gap-3 mb-6 text-sm">
          <Summary label="Registros" value={String(filtered.length)} />
          <Summary label="Pendentes" value={String(pendentes)} accent="var(--danger)" />
          <Summary label="Em Andamento" value={String(andamento)} accent="var(--chart-3)" />
          <Summary label="Concluídos" value={String(concluidos)} accent="var(--success)" />
        </div>


        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-primary text-primary-foreground text-left">
              <th className="px-2 py-2">Nº</th>
              <th className="px-2 py-2">Local</th>
              <th className="px-2 py-2">Descrição</th>
              <th className="px-2 py-2">Categoria</th>
              <th className="px-2 py-2">Funcionário</th>
              <th className="px-2 py-2">Status</th>
              <th className="px-2 py-2">Conclusão</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map(m => (
              <tr key={m.id} className="hover:bg-muted/40 transition-colors">
                <td className="px-2 py-2 font-mono">{m.numero_chamado}</td>
                <td className="px-2 py-2">{localLabel(m)}</td>
                <td className="px-2 py-2 max-w-xs">{m.descricao}</td>
                <td className="px-2 py-2">{m.categoria}</td>
                <td className="px-2 py-2">{m.funcionario ?? "—"}</td>
                <td className="px-2 py-2">{m.status}</td>
                <td className="px-2 py-2">{formatDate(m.data_conclusao)}</td>
              </tr>
            ))}
            {isLoading && (
              <tr><td colSpan={7} className="p-0"><TableSkeleton rows={8} cols={6} /></td></tr>
            )}
            {!isLoading && filtered.length === 0 && (
              <tr><td colSpan={7} className="p-0">
                <EmptyState
                  icon={BarChart3}
                  title="Sem dados para o período"
                  description="Ajuste os filtros de data ou aguarde novos chamados serem registrados."
                />
              </td></tr>
            )}
          </tbody>
        </table>

        <div className="mt-16 grid grid-cols-2 gap-12">
          <div className="text-center"><div className="border-t border-foreground/40 pt-2 text-xs text-muted-foreground">Síndico</div></div>
          <div className="text-center"><div className="border-t border-foreground/40 pt-2 text-xs text-muted-foreground">Administração</div></div>
        </div>

        <footer className="mt-8 pt-4 border-t text-center text-[10px] text-muted-foreground">
          Condomínio Europa · Sistema Europa Manutenção · Emitido em {formatDateTime(new Date().toISOString())}
        </footer>
      </Card>
    </div>
  );
}

function Summary({ label, value, accent }: { label: string; value: string; accent?: string }) {
  const style = accent ? { borderLeftColor: accent, borderLeftWidth: 4 } : undefined;
  return (
    <div className="border rounded p-3 bg-card" style={style}>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="font-bold text-base text-primary">{value}</div>
    </div>
  );
}


// ============================================================
// Aba: Por Ativo
// ============================================================
function RelatorioPorAtivo() {
  const { ativoId } = Route.useSearch();
  const navigate = useNavigate({ from: "/relatorios" });
  const { data: ativos = [] } = useQuery<Ativo[]>({ queryKey: ["ativos"], queryFn: listAtivos });
  const { data: items = [] } = useQuery({ queryKey: ["manutencoes"], queryFn: fetchManutencoes });

  const ativo = ativos.find(a => a.id === ativoId) ?? null;
  const doAtivo = useMemo(
    () => items.filter(m => (m as unknown as { ativo_id?: string }).ativo_id === ativoId),
    [items, ativoId]
  );

  const total = doAtivo.length;
  const concluidos = doAtivo.filter(m => m.status === "Concluído");
  const tempoMedioMs =
    concluidos.reduce((acc, m) => {
      if (!m.data_conclusao || !m.created_at) return acc;
      return acc + (parseDateOnly(m.data_conclusao).getTime() - new Date(m.created_at).getTime());
    }, 0) / (concluidos.length || 1);
  const tempoMedioDias = Math.round(tempoMedioMs / (1000 * 60 * 60 * 24));
  const ultima = [...concluidos].sort(
    (a, b) => parseDateOnly(b.data_conclusao!).getTime() - parseDateOnly(a.data_conclusao!).getTime()
  )[0];

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3 no-print">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-gold">Gestão</div>
          <h1 className="font-display text-3xl font-bold text-primary">Relatório por Ativo</h1>
        </div>
        <Button onClick={() => window.print()} className="bg-primary">
          <Printer className="h-4 w-4 mr-2" /> Imprimir / PDF
        </Button>
      </header>

      <Card className="p-4 no-print">
        <Label className="text-xs">Ativo</Label>
        <Select
          value={ativoId || undefined}
          onValueChange={(v) =>
            navigate({ search: (p: { tipo?: string; aba?: string; ativoId?: string }) => ({ ...p, ativoId: v }) })
          }
        >
          <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione um ativo" /></SelectTrigger>
          <SelectContent className="max-h-80">
            {ativos.map(a => (
              <SelectItem key={a.id} value={a.id}>
                {ativoLabel(a)}{a.torre ? ` — ${a.torre}` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Card>

      {ativo ? (
        <Card className="p-6 print-page bg-white text-black">
          <div className="border-b-2 border-primary pb-4 mb-6">
            <div className="text-[10px] uppercase tracking-[0.25em] text-[color:var(--gold)] font-bold">
              Condomínio Europa
            </div>
            <div className="font-display text-2xl font-bold text-primary">{ativoLabel(ativo)}</div>
            <div className="text-xs text-muted-foreground">
              {[ativo.categoria, ativo.torre, ativo.local].filter(Boolean).join(" · ")}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <Summary label="Total de chamados" value={String(total)} />
            <Summary label="Tempo médio (dias)" value={concluidos.length ? String(tempoMedioDias) : "—"} />
            <Summary label="Última manutenção" value={ultima?.data_conclusao ? formatDate(ultima.data_conclusao) : "—"} />
            <Summary label="Próxima preventiva" value={ativo.proxima_preventiva ? formatDate(ativo.proxima_preventiva) : "—"} />
          </div>

          <h3 className="font-display text-lg font-bold text-primary mb-3">Histórico de manutenções</h3>
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-primary text-primary-foreground text-left">
                <th className="px-2 py-2">Nº</th>
                <th className="px-2 py-2">Descrição</th>
                <th className="px-2 py-2">Categoria</th>
                <th className="px-2 py-2">Status</th>
                <th className="px-2 py-2">Abertura</th>
                <th className="px-2 py-2">Conclusão</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {doAtivo.map(m => (
                <tr key={m.id} className="hover:bg-muted/40 transition-colors">
                  <td className="px-2 py-2 font-mono">{m.numero_chamado}</td>
                  <td className="px-2 py-2">{m.descricao}</td>
                  <td className="px-2 py-2">{m.categoria}</td>
                  <td className="px-2 py-2">{m.status}</td>
                  <td className="px-2 py-2">{formatDate(m.created_at)}</td>
                  <td className="px-2 py-2">{formatDate(m.data_conclusao)}</td>
                </tr>
              ))}
              {doAtivo.length === 0 && (
                <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">Sem manutenções registradas</td></tr>
              )}
            </tbody>
          </table>
        </Card>
      ) : (
        <Card className="p-8 text-center text-muted-foreground">Selecione um ativo para ver o relatório.</Card>
      )}
    </div>
  );
}

// ============================================================
// Aba: Preventivas
// ============================================================
function RelatorioPreventivas() {
  const { data: ativos = [] } = useQuery<Ativo[]>({ queryKey: ["ativos"], queryFn: listAtivos });

  const rows = useMemo(() => {
    const now = Date.now();
    return ativos
      .filter(a => !!a.proxima_preventiva)
      .map(a => {
        const t = parseDateOnly(a.proxima_preventiva!).getTime();
        const diffDays = Math.round((t - now) / (1000 * 60 * 60 * 24));
        let status: "em_dia" | "em_breve" | "vencida" = "em_dia";
        if (diffDays < 0) status = "vencida";
        else if (diffDays <= 30) status = "em_breve";
        return { a, t, diffDays, status };
      })
      .sort((x, y) => x.t - y.t);
  }, [ativos]);

  const badge = (s: "em_dia" | "em_breve" | "vencida") => {
    if (s === "vencida") return { cls: "bg-[color:var(--danger)]/10 text-[color:var(--danger)]", label: "🔴 Vencida" };
    if (s === "em_breve") return { cls: "bg-[color:var(--warning)]/10 text-[color:var(--warning)]", label: "⚠️ Vence em breve" };
    return { cls: "bg-[color:var(--success)]/10 text-[color:var(--success)]", label: "✅ Em dia" };
  };

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3 no-print">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-gold">Gestão</div>
          <h1 className="font-display text-3xl font-bold text-primary">Manutenções Preventivas</h1>
          <p className="text-sm text-muted-foreground mt-1">Ativos ordenados pela próxima preventiva.</p>
        </div>
        <Button onClick={() => window.print()} className="bg-primary">
          <Printer className="h-4 w-4 mr-2" /> Imprimir / PDF
        </Button>
      </header>

      <Card className="p-6 print-page bg-white text-black">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-primary text-primary-foreground text-left">
              <th className="px-2 py-2">Ativo</th>
              <th className="px-2 py-2">Local</th>
              <th className="px-2 py-2">Última manutenção</th>
              <th className="px-2 py-2">Próxima preventiva</th>
              <th className="px-2 py-2">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map(({ a, status }) => {
              const b = badge(status);
              return (
                <tr key={a.id} className="hover:bg-muted/40 transition-colors">
                  <td className="px-2 py-2 font-medium">{ativoLabel(a)}</td>
                  <td className="px-2 py-2">{[a.torre, a.local].filter(Boolean).join(" · ") || "—"}</td>
                  <td className="px-2 py-2">{a.ultima_manutencao ? formatDate(a.ultima_manutencao) : "—"}</td>
                  <td className="px-2 py-2">{formatDate(a.proxima_preventiva)}</td>
                  <td className="px-2 py-2">
                    <span className={`inline-flex px-2 py-0.5 rounded text-[11px] font-semibold ${b.cls}`}>{b.label}</span>
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr><td colSpan={5} className="text-center py-8 text-muted-foreground">Nenhum ativo com preventiva agendada</td></tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
