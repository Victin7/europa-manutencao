import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft } from "lucide-react";
import { listPrestadores, CATEGORIAS_PRESTADOR, statusInfo } from "@/lib/prestadores";
import { formatDate } from "@/lib/manutencoes";

export const Route = createFileRoute("/_authenticated/prestadores/relatorios")({ component: Page });

type ManutRow = {
  id: string; numero_chamado: string; descricao: string; status: string;
  prestador_id: string | null; created_at: string; data_conclusao: string | null;
  valor_servico: number | null; garantia_dias: number | null;
  prestador_responsavel: string | null;
};

function Page() {
  const nav = useNavigate();
  const { data: prestadores = [] } = useQuery({ queryKey: ["prestadores"], queryFn: listPrestadores });
  const { data: manuts = [] } = useQuery({
    queryKey: ["manuts-terceirizadas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("manutencoes")
        .select("id,numero_chamado,descricao,status,prestador_id,created_at,data_conclusao,valor_servico,garantia_dias,prestador_responsavel")
        .eq("tipo_servico" as never, "terceirizado")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as ManutRow[];
    },
  });

  const [empresa, setEmpresa] = useState("todas");
  const [cat, setCat] = useState("todas");
  const [status, setStatus] = useState("todos");
  const [de, setDe] = useState("");
  const [ate, setAte] = useState("");

  const prestadorById = useMemo(() => new Map(prestadores.map(p => [p.id, p])), [prestadores]);

  const rows = useMemo(() => {
    return manuts.filter(m => {
      if (empresa !== "todas" && m.prestador_id !== empresa) return false;
      const p = m.prestador_id ? prestadorById.get(m.prestador_id) : null;
      if (cat !== "todas" && p?.categoria !== cat) return false;
      if (status !== "todos" && m.status !== status) return false;
      if (de && new Date(m.created_at) < new Date(de)) return false;
      if (ate && new Date(m.created_at) > new Date(ate + "T23:59:59")) return false;
      return true;
    });
  }, [manuts, empresa, cat, status, de, ate, prestadorById]);

  const totalValor = rows.reduce((a, b) => a + (Number(b.valor_servico) || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => nav({ to: "/prestadores" })}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
        </Button>
      </div>
      <header>
        <div className="text-xs uppercase tracking-[0.2em] text-gold">Prestadores</div>
        <h1 className="font-display text-3xl font-bold text-primary">Relatórios</h1>
      </header>

      <Card className="p-4">
        <div className="grid md:grid-cols-5 gap-3">
          <Select value={empresa} onValueChange={setEmpresa}>
            <SelectTrigger><SelectValue placeholder="Empresa" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas empresas</SelectItem>
              {prestadores.map(p => <SelectItem key={p.id} value={p.id}>{p.nome_empresa}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={cat} onValueChange={setCat}>
            <SelectTrigger><SelectValue placeholder="Categoria" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas categorias</SelectItem>
              {CATEGORIAS_PRESTADOR.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos status</SelectItem>
              <SelectItem value="Pendente">Pendente</SelectItem>
              <SelectItem value="Em Andamento">Em Andamento</SelectItem>
              <SelectItem value="Aguardando Aprovação">Aguardando Aprovação</SelectItem>
              <SelectItem value="Concluído">Concluído</SelectItem>
            </SelectContent>
          </Select>
          <Input type="date" value={de} onChange={e => setDe(e.target.value)} />
          <Input type="date" value={ate} onChange={e => setAte(e.target.value)} />
        </div>
      </Card>

      <Separator />

      <Card className="p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-primary text-primary-foreground text-xs uppercase tracking-wider text-left">
            <tr>
              <th className="text-left p-2">Chamado</th>
              <th className="text-left p-2">Empresa</th>
              <th className="text-left p-2">Categoria</th>
              <th className="text-left p-2">Status</th>
              <th className="text-left p-2">Abertura</th>
              <th className="text-left p-2">Conclusão</th>
              <th className="text-right p-2">Valor</th>
              <th className="text-right p-2">Garantia</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.length === 0 ? (
              <tr><td colSpan={8} className="p-4 text-center text-muted-foreground">Nenhum registro no filtro atual.</td></tr>
            ) : rows.map(r => {
              const p = r.prestador_id ? prestadorById.get(r.prestador_id) : null;
              return (
                <tr key={r.id} className="hover:bg-muted/40 transition-colors">
                  <td className="p-2 font-medium">{r.numero_chamado}</td>
                  <td className="p-2">{p ? `${statusInfo(p.status).emoji} ${p.nome_empresa}` : "—"}</td>
                  <td className="p-2">{p?.categoria ?? "—"}</td>
                  <td className="p-2">{r.status}</td>
                  <td className="p-2">{formatDate(r.created_at)}</td>
                  <td className="p-2">{formatDate(r.data_conclusao)}</td>
                  <td className="p-2 text-right">{r.valor_servico ? `R$ ${Number(r.valor_servico).toFixed(2)}` : "—"}</td>
                  <td className="p-2 text-right">{r.garantia_dias ? `${r.garantia_dias}d` : "—"}</td>
                </tr>
              );
            })}
          </tbody>
          {rows.length > 0 && (
            <tfoot>
              <tr className="bg-muted/30 font-semibold">
                <td colSpan={6} className="p-2 text-right">Total</td>
                <td className="p-2 text-right">R$ {totalValor.toFixed(2)}</td>
                <td />
              </tr>
            </tfoot>
          )}
        </table>
      </Card>
    </div>
  );
}
