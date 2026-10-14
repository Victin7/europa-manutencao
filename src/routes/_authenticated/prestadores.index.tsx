import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, FileBarChart, Building2 } from "lucide-react";
import {
  listPrestadores,
  CATEGORIAS_PRESTADOR, STATUS_PRESTADOR,
} from "@/lib/prestadores";
import { PrestadorCard } from "@/components/PrestadorCard";
import { useIsReadOnly } from "@/hooks/use-role";
import { EmptyState } from "@/components/EmptyState";
import { CardGridSkeleton } from "@/components/TableSkeleton";

export const Route = createFileRoute("/_authenticated/prestadores/")({ component: Page });

function Page() {
  const isReadOnly = useIsReadOnly();
  const { data: prestadores = [], isLoading } = useQuery({
    queryKey: ["prestadores"],
    queryFn: listPrestadores,
  });

  const { data: manuts = [] } = useQuery({
    queryKey: ["manutencoes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("manutencoes").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as Array<{
        id: string; prestador_id: string | null; status: string; tipo_servico: string | null; orcamentos?: unknown[];
      }>;
    },
  });

  const [busca, setBusca] = useState("");
  const [fCat, setFCat] = useState<string>("todas");
  const [fStatus, setFStatus] = useState<string>("todos");

  const filtered = useMemo(() => {
    return prestadores.filter(p => {
      if (fCat !== "todas" && p.categoria !== fCat) return false;
      if (fStatus !== "todos" && p.status !== fStatus) return false;
      if (busca && !`${p.nome_empresa} ${p.responsavel ?? ""} ${p.categoria}`.toLowerCase().includes(busca.toLowerCase())) return false;
      return true;
    });
  }, [prestadores, fCat, fStatus, busca]);

  const contByPrestador = useMemo(() => {
    const m = new Map<string, number>();
    for (const x of manuts) {
      if (x.prestador_id) m.set(x.prestador_id, (m.get(x.prestador_id) ?? 0) + 1);
    }
    return m;
  }, [manuts]);

  const kpis = useMemo(() => {
    const ativas = prestadores.filter(p => p.status === "ativa").length;
    const terc = manuts.filter(m => m.tipo_servico === "terceirizado");
    const emAndamento = terc.filter(m => m.status !== "Concluído").length;
    const aguardOrc = terc.filter(m => m.status !== "Concluído" && Array.isArray(m.orcamentos) && m.orcamentos.length === 0).length;
    const concluidos = terc.filter(m => m.status === "Concluído").length;
    return { ativas, emAndamento, aguardOrc, concluidos };
  }, [prestadores, manuts]);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-gold">Módulo</div>
          <h1 className="font-display text-3xl font-bold text-primary flex items-center gap-2">
            <Building2 className="h-7 w-7" /> Prestadores de Serviços
          </h1>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link to="/prestadores/relatorios"><FileBarChart className="h-4 w-4 mr-2" /> Relatórios</Link>
          </Button>
          {!isReadOnly && (
            <Button asChild>
              <Link to="/prestadores/novo"><Plus className="h-4 w-4 mr-2" /> Nova Empresa</Link>
            </Button>
          )}
        </div>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi label="Empresas ativas" value={kpis.ativas} />
        <Kpi label="Serviços em andamento" value={kpis.emAndamento} />
        <Kpi label="Aguardando orçamento" value={kpis.aguardOrc} />
        <Kpi label="Serviços concluídos" value={kpis.concluidos} />
      </div>

      <Card className="p-4">
        <div className="grid md:grid-cols-3 gap-3">
          <Input placeholder="Buscar empresa, responsável, categoria…" value={busca} onChange={e => setBusca(e.target.value)} />
          <Select value={fCat} onValueChange={setFCat}>
            <SelectTrigger><SelectValue placeholder="Categoria" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas categorias</SelectItem>
              {CATEGORIAS_PRESTADOR.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={fStatus} onValueChange={setFStatus}>
            <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos status</SelectItem>
              {STATUS_PRESTADOR.map(s => (
                <SelectItem key={s.value} value={s.value}>{s.emoji} {s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Card>

      {isLoading ? (
        <CardGridSkeleton count={6} height="h-40" />
      ) : filtered.length === 0 ? (
        <Card className="rounded-[var(--radius-card)] shadow-[var(--shadow-card)]">
          <EmptyState
            icon={Building2}
            title={prestadores.length === 0 ? "Nenhum prestador cadastrado" : "Nenhum resultado"}
            description={
              prestadores.length === 0
                ? "Adicione empresas terceirizadas para vinculá-las aos chamados."
                : "Nenhuma empresa corresponde aos filtros aplicados. Tente outros termos."
            }
            {...(prestadores.length === 0 && !isReadOnly
              ? { actionLabel: "Novo prestador", actionTo: "/prestadores/novo" }
              : {})}
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map(p => (
            <PrestadorCard key={p.id} prestador={p} totalServicos={contByPrestador.get(p.id) ?? 0} />
          ))}
        </div>
      )}
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: number }) {
  return (
    <Card className="p-4">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-2xl font-bold text-primary mt-1">{value}</div>
    </Card>
  );
}
