import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Package, ArrowLeft, CalendarClock, Activity, AlertTriangle, CheckCircle2, Timer, Wrench, ChevronRight, Plus } from "lucide-react";
import {
  getAtivo,
  getAtivoHistorico,
  listAtivos,
  ativoPath,
  type Ativo,
  type AtivoHistorico,
  STATUS_ATIVO_LABEL,
  STATUS_ATIVO_COLOR,
  TIPO_ATIVO_LABEL,
} from "@/lib/ativos";
import { formatDate, statusBadgeClasses } from "@/lib/manutencoes";

export const Route = createFileRoute("/_authenticated/ativos/$id")({
  head: () => ({
    meta: [
      { title: "Detalhes do Ativo — Europa Manutenção" },
      { name: "description", content: "Histórico e indicadores do ativo." },
    ],
  }),
  component: AtivoDetailPage,
  notFoundComponent: () => (
    <div className="p-6 text-center text-muted-foreground">Ativo não encontrado.</div>
  ),
  errorComponent: () => (
    <div className="p-6 text-center text-muted-foreground">Erro ao carregar ativo.</div>
  ),
});

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_ATIVO_COLOR[status] ?? ""}`}>
      {STATUS_ATIVO_LABEL[status] ?? status}
    </span>
  );
}

function AtivoDetailPage() {
  const { id } = Route.useParams();
  const router = useRouter();
  const [ativo, setAtivo] = useState<Ativo | null>(null);
  const [hist, setHist] = useState<AtivoHistorico | null>(null);
  const [all, setAll] = useState<Ativo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    Promise.all([getAtivo(id), getAtivoHistorico(id), listAtivos()])
      .then(([a, h, list]) => { if (alive) { setAtivo(a); setHist(h); setAll(list); } })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [id]);

  if (loading) return <div className="p-6 text-center text-muted-foreground">Carregando…</div>;
  if (!ativo) return <div className="p-6 text-center text-muted-foreground">Ativo não encontrado.</div>;

  const path = ativoPath(ativo.id, all);
  const children = all.filter(a => a.parent_id === ativo.id);

  const kpis = [
    { label: "Total de manutenções", value: hist?.total ?? 0, icon: Wrench, tone: "text-primary bg-primary/10" },
    { label: "Em andamento", value: hist?.ativas ?? 0, icon: Activity, tone: "text-[color:var(--chart-3)] bg-[color:var(--chart-3)]/10" },
    { label: "Concluídas", value: hist?.concluidas ?? 0, icon: CheckCircle2, tone: "text-[color:var(--success)] bg-[color:var(--success)]/10" },
    { label: "Emergenciais", value: hist?.emergenciais ?? 0, icon: AlertTriangle, tone: "text-[color:var(--danger)] bg-[color:var(--danger)]/10" },
    { label: "MTBF (dias)", value: hist?.mtbfDias ?? "—", icon: Timer, tone: "text-[color:var(--warning)] bg-[color:var(--warning)]/10" },
  ];

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.history.back()}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
        </Button>
      </div>

      {/* Breadcrumb hierárquico */}
      {path.length > 1 && (
        <nav className="flex items-center flex-wrap gap-1 text-sm text-muted-foreground">
          {path.map((p, i) => (
            <span key={p.id} className="flex items-center gap-1">
              {i > 0 && <ChevronRight className="h-3.5 w-3.5" />}
              {p.id === ativo.id ? (
                <span className="text-foreground font-medium">{p.nome}</span>
              ) : (
                <Link to="/ativos/$id" params={{ id: p.id }} className="hover:text-primary hover:underline">
                  {p.nome}
                </Link>
              )}
            </span>
          ))}
        </nav>
      )}

      <div className="flex items-start gap-4">
        <div className="p-3 rounded-2xl bg-primary/10 text-primary shrink-0">
          <Package className="h-7 w-7" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold truncate">{ativo.nome}</h1>
            <StatusBadge status={ativo.status_ativo} />
            <Badge variant="outline" className="text-[10px]">{TIPO_ATIVO_LABEL[ativo.tipo]}</Badge>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <Badge variant="secondary">{ativo.categoria}</Badge>
            {ativo.torre && <span>· {ativo.torre}</span>}
            {ativo.local && ativo.local !== ativo.torre && <span>· {ativo.local}</span>}
            {ativo.codigo_interno && <span>· Código {ativo.codigo_interno}</span>}
          </div>
          {ativo.observacoes && (
            <p className="mt-2 text-sm">{ativo.observacoes}</p>
          )}
        </div>
        <Button asChild size="sm" className="gap-1 shrink-0">
          <Link to="/manutencoes/nova" search={{ ativo: ativo.id } as never}>
            <Plus className="h-4 w-4" /> Nova manutenção
          </Link>
        </Button>
      </div>

      {/* Informações operacionais */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Informações do ativo</CardTitle></CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 text-sm">
          <Info label="Categoria" value={ativo.categoria} />
          <Info label="Nº série" value={ativo.numero_serie} />
          <Info label="Fabricante" value={ativo.fabricante} />
          <Info label="Modelo" value={ativo.modelo} />
          <Info label="Nº patrimônio" value={ativo.numero_patrimonio} />
          <Info label="Garantia até" value={formatDate(ativo.garantia_ate)} />
          <Info label="Empresa responsável" value={ativo.empresa_responsavel} />
          <Info label="Última manutenção" value={formatDate(ativo.ultima_manutencao)} />
          <Info label="Próxima preventiva" value={formatDate(ativo.proxima_preventiva)} />
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {kpis.map(k => {
          const Icon = k.icon;
          return (
            <Card key={k.label}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`p-2 rounded-xl ${k.tone}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs text-muted-foreground">{k.label}</div>
                  <div className="text-2xl font-semibold">{k.value}</div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Subativos / Componentes */}
      {children.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Subativos e componentes ({children.length})</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
            {children.map(c => (
              <Link
                key={c.id}
                to="/ativos/$id"
                params={{ id: c.id }}
                className="rounded-xl border p-3 hover:border-primary/40 hover:shadow-sm transition"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{c.nome}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {TIPO_ATIVO_LABEL[c.tipo]}{c.categoria ? ` · ${c.categoria}` : ""}
                    </div>
                  </div>
                  <StatusBadge status={c.status_ativo} />
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-[color:var(--success)]" /> Última manutenção
            </CardTitle>
          </CardHeader>
          <CardContent>
            {hist?.ultima ? (
              <Link to="/manutencoes/$id" params={{ id: hist.ultima.id }} className="block hover:underline">
                <div className="font-medium">{hist.ultima.numero_chamado}</div>
                <div className="text-sm text-muted-foreground line-clamp-2">{hist.ultima.descricao}</div>
                <div className="text-xs text-muted-foreground mt-1">Concluída em {formatDate(hist.ultima.data)}</div>
              </Link>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhuma manutenção concluída ainda.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-[color:var(--warning)]" /> Próxima manutenção
            </CardTitle>
          </CardHeader>
          <CardContent>
            {hist?.proxima ? (
              <Link to="/manutencoes/$id" params={{ id: hist.proxima.id }} className="block hover:underline">
                <div className="font-medium">{hist.proxima.numero_chamado}</div>
                <div className="text-sm text-muted-foreground line-clamp-2">{hist.proxima.descricao}</div>
                <div className="text-xs text-muted-foreground mt-1">Prevista para {formatDate(hist.proxima.data)}</div>
              </Link>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhuma manutenção agendada.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Histórico de manutenções</CardTitle>
        </CardHeader>
        <CardContent>
          {!hist || hist.manutencoes.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Ainda não há manutenções vinculadas a este ativo.
            </p>
          ) : (
            <div className="divide-y">
              {hist.manutencoes.map(m => (
                <Link
                  key={m.id}
                  to="/manutencoes/$id"
                  params={{ id: m.id }}
                  className="flex items-center gap-3 py-3 hover:bg-muted/40 rounded-md px-2 transition"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{m.numero_chamado}</span>
                      <Badge variant="outline" className="text-[10px]">{m.categoria}</Badge>
                      {m.prioridade === "Emergencial" && (
                        <Badge className="text-[10px] bg-[color:var(--danger)]/15 text-[color:var(--danger)] border-[color:var(--danger)]/30">
                          Emergencial
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{m.descricao}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <Badge className={`text-[10px] ${statusBadgeClasses(m.status)}`} variant="outline">
                      {m.status}
                    </Badge>
                    <div className="text-[11px] text-muted-foreground mt-1">
                      {formatDate(m.data_conclusao ?? m.created_at)}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-medium">{value || "—"}</div>
    </div>
  );
}
