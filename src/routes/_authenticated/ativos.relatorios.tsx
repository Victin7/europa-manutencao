import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Package, TrendingUp, AlertTriangle, Timer, ArrowLeft } from "lucide-react";
import { listAtivos, CATEGORIAS_ATIVO, type Ativo } from "@/lib/ativos";
import { fetchManutencoes, parseDateOnly, type Manutencao, TORRES } from "@/lib/manutencoes";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export const Route = createFileRoute("/_authenticated/ativos/relatorios")({
  head: () => ({
    meta: [
      { title: "Relatórios de Ativos — Europa Manutenção" },
      { name: "description", content: "Análise de manutenções por ativo, categoria e torre." },
    ],
  }),
  component: AtivosRelatoriosPage,
});

type Row = {
  ativo: Ativo;
  total: number;
  ativas: number;
  concluidas: number;
  emergenciais: number;
  mtbfDias: number | null;
  ultima: string | null;
};

function computeMtbf(datas: number[]): number | null {
  if (datas.length < 2) return null;
  const sorted = [...datas].sort((a, b) => a - b);
  const diffs: number[] = [];
  for (let i = 1; i < sorted.length; i++) diffs.push(sorted[i] - sorted[i - 1]);
  return Math.round(diffs.reduce((s, n) => s + n, 0) / diffs.length / (1000 * 60 * 60 * 24));
}

function AtivosRelatoriosPage() {
  const [ativos, setAtivos] = useState<Ativo[]>([]);
  const [manut, setManut] = useState<Manutencao[]>([]);
  const [loading, setLoading] = useState(true);
  const [torre, setTorre] = useState("todas");
  const [cat, setCat] = useState("todas");
  const [q, setQ] = useState("");

  useEffect(() => {
    Promise.all([listAtivos(), fetchManutencoes()])
      .then(([a, m]) => { setAtivos(a); setManut(m); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const rows: Row[] = useMemo(() => {
    const byAtivo = new Map<string, Manutencao[]>();
    for (const m of manut) {
      if (!m.ativo_id) continue;
      if (!byAtivo.has(m.ativo_id)) byAtivo.set(m.ativo_id, []);
      byAtivo.get(m.ativo_id)!.push(m);
    }
    return ativos.map(a => {
      const list = byAtivo.get(a.id) ?? [];
      const concl = list.filter(m => m.status === "Concluído");
      const datas = concl
        .map(m => m.data_conclusao ? parseDateOnly(m.data_conclusao).getTime() : null)
        .filter((n): n is number => n !== null);
      const ultima = concl
        .map(m => m.data_conclusao ? parseDateOnly(m.data_conclusao).getTime() : 0)
        .sort((a, b) => b - a)[0];
      return {
        ativo: a,
        total: list.length,
        ativas: list.filter(m => m.status !== "Concluído").length,
        concluidas: concl.length,
        emergenciais: list.filter(m => m.prioridade === "Emergencial").length,
        mtbfDias: computeMtbf(datas),
        ultima: ultima ? new Date(ultima).toISOString() : null,
      };
    });
  }, [ativos, manut]);

  const filtered = useMemo(() => {
    return rows.filter(r => {
      if (torre !== "todas" && r.ativo.torre !== torre) return false;
      if (cat !== "todas" && r.ativo.categoria !== cat) return false;
      if (q.trim()) {
        const s = q.trim().toLowerCase();
        const hay = `${r.ativo.nome} ${r.ativo.categoria} ${r.ativo.torre ?? ""}`.toLowerCase();
        if (!hay.includes(s)) return false;
      }
      return true;
    });
  }, [rows, torre, cat, q]);

  const totalManut = filtered.reduce((s, r) => s + r.total, 0);
  const totalEmerg = filtered.reduce((s, r) => s + r.emergenciais, 0);
  const ativosSemManut = filtered.filter(r => r.total === 0).length;
  const mtbfAtivos = filtered.filter(r => r.mtbfDias !== null);
  const mtbfMedio = mtbfAtivos.length
    ? Math.round(mtbfAtivos.reduce((s, r) => s + (r.mtbfDias ?? 0), 0) / mtbfAtivos.length)
    : null;

  const topAtivos = [...filtered].sort((a, b) => b.total - a.total).slice(0, 10);
  const porCategoria = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of filtered) map.set(r.ativo.categoria, (map.get(r.ativo.categoria) ?? 0) + r.total);
    return Array.from(map.entries())
      .map(([categoria, total]) => ({ categoria, total }))
      .sort((a, b) => b.total - a.total);
  }, [filtered]);

  const kpis = [
    { label: "Ativos analisados", value: filtered.length, icon: Package, tone: "text-primary bg-primary/10" },
    { label: "Manutenções vinculadas", value: totalManut, icon: TrendingUp, tone: "text-[color:var(--chart-3)] bg-[color:var(--chart-3)]/10" },
    { label: "Emergenciais", value: totalEmerg, icon: AlertTriangle, tone: "text-[color:var(--danger)] bg-[color:var(--danger)]/10" },
    { label: "MTBF médio (dias)", value: mtbfMedio ?? "—", icon: Timer, tone: "text-[color:var(--warning)] bg-[color:var(--warning)]/10" },
  ];

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-center gap-2">
        <Link to="/ativos" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
          <ArrowLeft className="h-4 w-4" /> Voltar para ativos
        </Link>
      </div>

      <div>
        <div className="text-xs uppercase tracking-[0.2em] text-gold">Ativos</div>
        <h1 className="font-display text-3xl font-bold text-primary">Relatórios de Ativos</h1>
        <p className="text-sm text-muted-foreground">Manutenções por ativo, categoria e torre.</p>
      </div>

      <Card>
        <CardContent className="p-4 grid gap-3 md:grid-cols-4">
          <Input placeholder="Buscar ativo…" value={q} onChange={e => setQ(e.target.value)} />
          <Select value={torre} onValueChange={setTorre}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas as torres</SelectItem>
              <SelectItem value="Geral">Geral</SelectItem>
              {TORRES.map(t => <SelectItem key={t.id} value={t.id}>{t.id} — {t.nome}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={cat} onValueChange={setCat}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas as categorias</SelectItem>
              {CATEGORIAS_ATIVO.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="text-xs text-muted-foreground self-center">
            {ativosSemManut} ativo(s) sem manutenção vinculada
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Top 10 ativos com mais manutenções</CardTitle></CardHeader>
          <CardContent>
            {loading ? (
              <div className="py-8 text-center text-sm text-muted-foreground">Carregando…</div>
            ) : topAtivos.length === 0 || topAtivos.every(r => r.total === 0) ? (
              <div className="py-8 text-center text-sm text-muted-foreground">Sem dados no filtro atual.</div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={topAtivos.map(r => ({ nome: r.ativo.nome, total: r.total }))} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} />
                  <YAxis type="category" dataKey="nome" width={140} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="total" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Manutenções por categoria de ativo</CardTitle></CardHeader>
          <CardContent>
            {loading ? (
              <div className="py-8 text-center text-sm text-muted-foreground">Carregando…</div>
            ) : porCategoria.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">Sem dados.</div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={porCategoria}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="categoria" tick={{ fontSize: 11 }} interval={0} angle={-25} textAnchor="end" height={70} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="total" fill="hsl(var(--chart-3))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Detalhamento por ativo</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-primary text-primary-foreground text-xs uppercase tracking-wider text-left">
                <tr>
                  <th className="text-left p-3">Ativo</th>
                  <th className="text-left p-3">Categoria</th>
                  <th className="text-left p-3">Torre</th>
                  <th className="text-right p-3">Total</th>
                  <th className="text-right p-3">Ativas</th>
                  <th className="text-right p-3">Concluídas</th>
                  <th className="text-right p-3">Emerg.</th>
                  <th className="text-right p-3">MTBF (d)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">Carregando…</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">Nenhum ativo encontrado.</td></tr>
                ) : (
                  filtered
                    .sort((a, b) => b.total - a.total)
                    .map(r => (
                      <tr key={r.ativo.id} className="hover:bg-muted/40 transition-colors">
                        <td className="p-3">
                          <Link to="/ativos/$id" params={{ id: r.ativo.id }} className="font-medium hover:underline">
                            {r.ativo.nome}
                          </Link>
                        </td>
                        <td className="p-3"><Badge variant="secondary" className="text-[10px]">{r.ativo.categoria}</Badge></td>
                        <td className="p-3 text-muted-foreground">{r.ativo.torre ?? "—"}</td>
                        <td className="p-3 text-right font-semibold">{r.total}</td>
                        <td className="p-3 text-right">{r.ativas}</td>
                        <td className="p-3 text-right">{r.concluidas}</td>
                        <td className="p-3 text-right">
                          {r.emergenciais > 0 ? (
                            <span className="text-[color:var(--danger)] font-semibold">{r.emergenciais}</span>
                          ) : "—"}
                        </td>
                        <td className="p-3 text-right">{r.mtbfDias ?? "—"}</td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
