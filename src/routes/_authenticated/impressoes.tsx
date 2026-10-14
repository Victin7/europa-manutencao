import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  FileText,
  ClipboardList,
  Calendar,
  CalendarDays,
  Building2,
  CheckSquare,
  Square,
  Printer,
} from "lucide-react";
import { TORRES, fetchManutencoes, localLabel, formatDate } from "@/lib/manutencoes";
import { useAllowedTorres, useCurrentProfile } from "@/hooks/use-role";

export const Route = createFileRoute("/_authenticated/impressoes")({ component: ImpressoesPage });

const STATUS_OPCOES = [
  { value: "Pendente", label: "Pendentes", cor: "border-red-400 bg-red-50 text-red-700" },
  { value: "Em Andamento", label: "Em Andamento", cor: "border-blue-400 bg-blue-50 text-blue-700" },
  { value: "Aguardando Aprovação", label: "Aguardando Aprovação", cor: "border-amber-400 bg-amber-50 text-amber-700" },
  { value: "Concluído", label: "Concluídos", cor: "border-green-400 bg-green-50 text-green-700" },
  { value: "Cancelado", label: "Cancelados", cor: "border-gray-400 bg-gray-50 text-gray-600" },
] as const;

type StatusValue = (typeof STATUS_OPCOES)[number]["value"];

const STORAGE_KEY = "europa-impressoes-status";
const PADRAO_ATIVOS: StatusValue[] = ["Pendente", "Em Andamento", "Aguardando Aprovação"];

function ImpressoesPage() {
  const allowedTorres = useAllowedTorres();
  const torresVisiveis = allowedTorres ? TORRES.filter(t => allowedTorres.includes(t.id)) : TORRES;
  const { data: manutencoes = [] } = useQuery({ queryKey: ["manutencoes"], queryFn: fetchManutencoes });
  const { data: profile } = useCurrentProfile();

  const [statusSelecionados, setStatusSelecionados] = useState<StatusValue[]>(PADRAO_ATIVOS);
  const [filtroTorre, setFiltroTorre] = useState<string>("");

  // localStorage só após a hidratação (evita mismatch de SSR)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setStatusSelecionados(JSON.parse(saved) as StatusValue[]);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(statusSelecionados));
    } catch {
      /* ignore */
    }
  }, [statusSelecionados]);

  function toggleStatus(v: StatusValue) {
    setStatusSelecionados(prev => (prev.includes(v) ? prev.filter(s => s !== v) : [...prev, v]));
  }

  const itens = manutencoes.filter(m => {
    if (allowedTorres && m.local_manutencao !== "Geral" && !allowedTorres.includes(m.local_manutencao)) return false;
    if (filtroTorre && m.local_manutencao !== filtroTorre) return false;
    return true;
  });

  const itensFiltrados = itens.filter(
    m => statusSelecionados.length === 0 || statusSelecionados.includes(m.status as StatusValue),
  );

  function contagemLocal(id: string) {
    return manutencoes.filter(m => m.local_manutencao === id && m.status !== "Concluído").length;
  }

  const acoesRapidas = [
    { label: "Selecionar todos", acao: () => setStatusSelecionados(STATUS_OPCOES.map(o => o.value)) },
    { label: "Limpar seleção", acao: () => setStatusSelecionados([]) },
    { label: "Somente ativos", acao: () => setStatusSelecionados([...PADRAO_ATIVOS]) },
    { label: "Somente concluídos", acao: () => setStatusSelecionados(["Concluído"]) },
    { label: "Somente pendentes", acao: () => setStatusSelecionados(["Pendente"]) },
    { label: "Somente em andamento", acao: () => setStatusSelecionados(["Em Andamento"]) },
    { label: "Somente aguardando", acao: () => setStatusSelecionados(["Aguardando Aprovação"]) },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="no-print space-y-6">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-gold">Central de Impressões</div>
            <h1 className="font-display text-3xl font-bold text-primary">🖨️ Impressões</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Documentos profissionais em formato A4 prontos para imprimir ou exportar como PDF.
            </p>
          </div>
          <Button
            onClick={() => {
              setStatusSelecionados([...PADRAO_ATIVOS]);
              setTimeout(() => window.print(), 150);
            }}
            className="bg-gold text-gold-foreground hover:bg-gold/90 font-medium"
          >
            <Printer className="h-4 w-4 mr-2" />
            Imprimir Chamados Ativos
          </Button>
        </header>

        <div className="grid md:grid-cols-2 gap-4">
          <Link to="/manutencoes">
            <Tile icon={ClipboardList} title="Imprimir Lista de Chamados" desc="Tabela com todos os chamados filtrados, status, datas e funcionários." />
          </Link>
          <Link to="/manutencoes">
            <Tile icon={FileText} title="Imprimir Ordem de Serviço" desc="Abra um chamado e clique em 'Gerar Ordem de Serviço' para imprimir a OS individual." />
          </Link>
          <Link to="/relatorios" search={{ tipo: "mes" as const }}>
            <Tile icon={Calendar} title="Imprimir Relatório Mensal" desc="Relatório completo do mês corrente." />
          </Link>
          <Link to="/relatorios" search={{ tipo: "ano" as const }}>
            <Tile icon={CalendarDays} title="Imprimir Relatório Anual" desc="Consolidação anual de manutenções por categoria e local." />
          </Link>
        </div>

        <Card className="p-6 space-y-4">
          <h2 className="font-display text-lg font-semibold text-primary">Filtros da impressão</h2>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs uppercase tracking-wide text-muted-foreground mr-1">Local</span>
            <button
              type="button"
              onClick={() => setFiltroTorre("")}
              className={`px-3 py-1.5 rounded-full border text-xs font-medium transition-all ${
                filtroTorre === "" ? "border-gold bg-gold/10 text-primary" : "border-border bg-background text-muted-foreground hover:bg-muted"
              }`}
            >
              Todos
            </button>
            {["Geral", ...torresVisiveis.map(t => t.id)].map(id => (
              <button
                key={id}
                type="button"
                onClick={() => setFiltroTorre(id)}
                className={`px-3 py-1.5 rounded-full border text-xs font-medium transition-all ${
                  filtroTorre === id ? "border-gold bg-gold/10 text-primary" : "border-border bg-background text-muted-foreground hover:bg-muted"
                }`}
              >
                {id}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-x-3 gap-y-1">
            {acoesRapidas.map(({ label, acao }) => (
              <button
                key={label}
                type="button"
                onClick={acao}
                className="text-[11px] text-muted-foreground underline-offset-2 hover:text-primary hover:underline"
              >
                {label}
              </button>
            ))}
          </div>

          <div className="space-y-2">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Status</div>
            <div className="flex flex-wrap gap-2">
              {STATUS_OPCOES.map(op => {
                const ativo = statusSelecionados.includes(op.value);
                return (
                  <button
                    key={op.value}
                    type="button"
                    onClick={() => toggleStatus(op.value)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-all duration-150 select-none ${
                      ativo ? `${op.cor} shadow-sm` : "border-border bg-background text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {ativo ? <CheckSquare className="h-3.5 w-3.5" /> : <Square className="h-3.5 w-3.5" />}
                    {op.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between border-t pt-3">
            <span className="text-sm text-muted-foreground">
              {itensFiltrados.length} chamado(s) na seleção atual
            </span>
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Printer className="h-4 w-4 mr-2" /> Imprimir seleção
            </Button>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="font-display text-lg font-semibold mb-4 flex items-center gap-2">
            <Building2 className="h-5 w-5 text-gold" /> Histórico por Local
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <Link to="/local/$local" params={{ local: "Geral" }} className="border rounded-md p-3 hover:border-gold hover:bg-muted/40 text-sm">
              <div className="font-semibold text-primary">Geral</div>
              <div className="text-xs text-muted-foreground">Áreas Comuns</div>
              <div className="text-[11px] text-muted-foreground mt-1">
                {contagemLocal("Geral") > 0 ? `${contagemLocal("Geral")} chamado(s) ativo(s)` : "Sem chamados ativos"}
              </div>
            </Link>
            {torresVisiveis.map(t => {
              const n = contagemLocal(t.id);
              return (
                <Link key={t.id} to="/local/$local" params={{ local: t.id }} className="border rounded-md p-3 hover:border-gold hover:bg-muted/40 text-sm">
                  <div className="font-semibold text-primary">{t.id}</div>
                  <div className="text-xs text-muted-foreground">{t.nome}</div>
                  <div className="text-[11px] text-muted-foreground mt-1">
                    {n > 0 ? `${n} chamado(s) ativo(s)` : "Sem chamados ativos"}
                  </div>
                </Link>
              );
            })}
          </div>
        </Card>
      </div>

      {/* ==== Documento de impressão ==== */}
      <div className="print-only text-[11px] text-black">
        <div className="text-center border-b-2 border-black pb-2 mb-3">
          <div className="text-lg font-bold uppercase">Condomínio Europa</div>
          <div className="text-sm">Relatório de Chamados de Manutenção</div>
        </div>

        <div className="border border-black/40 rounded p-2 mb-3 space-y-0.5">
          <p>
            <strong>Status:</strong>{" "}
            {statusSelecionados.length === STATUS_OPCOES.length ? "Todos" : statusSelecionados.join(" • ") || "Nenhum"}
          </p>
          {filtroTorre && (
            <p>
              <strong>Local:</strong> {filtroTorre}
            </p>
          )}
          <p>
            <strong>Emitido em:</strong> {new Date().toLocaleString("pt-BR")}
          </p>
          {profile?.display_name && (
            <p>
              <strong>Usuário:</strong> {profile.display_name}
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          {STATUS_OPCOES.filter(op => statusSelecionados.includes(op.value)).map(op => {
            const count = itensFiltrados.filter(m => m.status === op.value).length;
            return (
              <div key={op.value} className="border border-black/40 rounded px-3 py-1 text-center min-w-[90px]">
                <div className="text-base font-bold">{count}</div>
                <div className="text-[10px] uppercase">{op.label}</div>
              </div>
            );
          })}
          <div className="border-2 border-black rounded px-3 py-1 text-center min-w-[90px]">
            <div className="text-base font-bold">{itensFiltrados.length}</div>
            <div className="text-[10px] uppercase">Total</div>
          </div>
        </div>

        {STATUS_OPCOES.filter(op => statusSelecionados.includes(op.value)).map(op => {
          const grupo = itensFiltrados.filter(m => m.status === op.value);
          if (grupo.length === 0) return null;
          return (
            <div key={op.value} className="mb-5">
              <div className="bg-black/10 border border-black/40 px-2 py-1 font-bold uppercase text-[11px]">
                {op.label.toUpperCase()} ({grupo.length})
              </div>
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="border border-black/40 px-1 py-0.5 text-left">Nº</th>
                    <th className="border border-black/40 px-1 py-0.5 text-left">Local</th>
                    <th className="border border-black/40 px-1 py-0.5 text-left">Descrição</th>
                    <th className="border border-black/40 px-1 py-0.5 text-left">Categoria</th>
                    <th className="border border-black/40 px-1 py-0.5 text-left">Funcionário</th>
                    <th className="border border-black/40 px-1 py-0.5 text-left">Data Prevista</th>
                    <th className="border border-black/40 px-1 py-0.5 text-left">Conclusão</th>
                  </tr>
                </thead>
                <tbody>
                  {grupo.map(m => (
                    <tr key={m.id}>
                      <td className="border border-black/40 px-1 py-0.5">{m.numero_chamado}</td>
                      <td className="border border-black/40 px-1 py-0.5">{localLabel(m)}</td>
                      <td className="border border-black/40 px-1 py-0.5">{m.descricao}</td>
                      <td className="border border-black/40 px-1 py-0.5">{m.categoria}</td>
                      {/* Campo legado `funcionario`: a equipe não é carregada em bulk aqui para evitar N+1. */}
                      <td className="border border-black/40 px-1 py-0.5">{m.funcionario ?? "—"}</td>
                      <td className="border border-black/40 px-1 py-0.5">{formatDate(m.data_prevista)}</td>
                      <td className="border border-black/40 px-1 py-0.5">{formatDate(m.data_conclusao)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Tile({ icon: Icon, title, desc }: { icon: React.ElementType; title: string; desc: string }) {
  return (
    <Card className="p-6 hover:shadow-lg hover:border-gold transition-all cursor-pointer h-full">
      <div className="flex items-start gap-4">
        <div className="h-10 w-10 rounded-lg bg-muted grid place-items-center shrink-0">
          <Icon className="h-5 w-5 text-muted-foreground" />
        </div>
        <div>
          <h3 className="font-display text-lg font-semibold text-primary">{title}</h3>
          <p className="text-sm text-muted-foreground mt-1">{desc}</p>
        </div>
      </div>
    </Card>
  );
}
