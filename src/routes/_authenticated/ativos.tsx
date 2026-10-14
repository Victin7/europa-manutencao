import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Package, Search, Plus, ChevronRight, ChevronDown, History, ArrowUpDown } from "lucide-react";
import {
  listAtivos,
  listAtivosTree,
  createAtivo,
  type Ativo,
  CATEGORIAS_ATIVO,
  TIPOS_ATIVO,
  TIPO_ATIVO_LABEL,
  STATUS_ATIVO,
  STATUS_ATIVO_LABEL,
  STATUS_ATIVO_COLOR,
} from "@/lib/ativos";
import { TORRES, formatDate } from "@/lib/manutencoes";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { EmptyState } from "@/components/EmptyState";
import { TreeSkeleton, TableSkeleton } from "@/components/TableSkeleton";

export const Route = createFileRoute("/_authenticated/ativos")({
  head: () => ({
    meta: [
      { title: "Ativos — Europa Manutenção" },
      { name: "description", content: "Hierarquia de locais, ativos e componentes do condomínio." },
    ],
  }),
  component: AtivosPage,
});

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${STATUS_ATIVO_COLOR[status] ?? ""}`}>
      {STATUS_ATIVO_LABEL[status] ?? status}
    </span>
  );
}

function AtivosPage() {
  const [flat, setFlat] = useState<Ativo[]>([]);
  const [tree, setTree] = useState<Ativo[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  async function refresh() {
    setLoading(true);
    try {
      const [f, t] = await Promise.all([listAtivos(), listAtivosTree()]);
      setFlat(f);
      setTree(t);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { refresh().catch(() => setLoading(false)); }, []);

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-primary/10 text-primary">
          <Package className="h-6 w-6" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs uppercase tracking-[0.2em] text-gold">Módulo</div>
          <h1 className="font-display text-3xl font-bold text-primary">Ativos & Patrimônios</h1>
          <p className="text-sm text-muted-foreground">
            Hierarquia de locais, equipamentos e componentes.
          </p>
        </div>
        <Link
          to="/ativos/relatorios"
          className="hidden sm:inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-muted transition"
        >
          Relatórios
        </Link>
        <Button onClick={() => setModalOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Novo ativo
        </Button>
      </div>

      <Tabs defaultValue="arvore" className="space-y-4">
        <TabsList>
          <TabsTrigger value="arvore">Árvore</TabsTrigger>
          <TabsTrigger value="lista">Lista</TabsTrigger>
          <TabsTrigger value="elevadores">Elevadores</TabsTrigger>
        </TabsList>

        <TabsContent value="arvore">
          {loading ? (
            <Card className="rounded-[var(--radius-card)] shadow-[var(--shadow-card)]"><CardContent className="p-2 md:p-4"><TreeSkeleton rows={6} /></CardContent></Card>
          ) : tree.length === 0 ? (
            <Card className="rounded-[var(--radius-card)] shadow-[var(--shadow-card)]">
              <CardContent className="p-0">
                <EmptyState
                  icon={Package}
                  title="Nenhum ativo cadastrado"
                  description="Cadastre equipamentos e locais para vinculá-los aos chamados."
                />
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-2 md:p-4">
                <div className="space-y-1">
                  {tree.map(n => <TreeNode key={n.id} node={n} depth={0} />)}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="lista">
          <ListaView items={flat} loading={loading} />
        </TabsContent>

        <TabsContent value="elevadores">
          <ElevadoresView items={flat} loading={loading} />
        </TabsContent>
      </Tabs>

      <NovoAtivoDialog
        open={modalOpen}
        onOpenChange={setModalOpen}
        parents={flat}
        onCreated={() => { setModalOpen(false); refresh(); }}
      />
    </div>
  );
}

/* -------------------- Árvore -------------------- */

function TreeNode({ node, depth }: { node: Ativo; depth: number }) {
  const [open, setOpen] = useState(depth < 1);
  const hasChildren = !!node.children && node.children.length > 0;
  return (
    <div>
      <div
        className="flex items-center gap-2 py-1.5 pr-2 rounded-md hover:bg-muted/50 transition"
        style={{ paddingLeft: `${depth * 16 + 4}px` }}
      >
        {hasChildren ? (
          <button
            onClick={() => setOpen(o => !o)}
            className="p-0.5 rounded hover:bg-muted"
            aria-label={open ? "Fechar" : "Abrir"}
          >
            {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
        ) : (
          <span className="w-5" />
        )}
        <Package className={`h-4 w-4 ${node.tipo === "local" ? "text-primary" : "text-muted-foreground"}`} />
        <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
          <span className={`truncate ${node.tipo === "local" ? "font-medium" : ""}`}>{node.nome}</span>
          <Badge variant="outline" className="text-[10px]">{TIPO_ATIVO_LABEL[node.tipo]}</Badge>
          <StatusBadge status={node.status_ativo} />
          {node.categoria && node.tipo !== "local" && (
            <span className="text-xs text-muted-foreground">· {node.categoria}</span>
          )}
        </div>
        <Link
          to="/ativos/$id"
          params={{ id: node.id }}
          className="inline-flex items-center gap-1 text-xs text-primary hover:underline shrink-0"
        >
          <History className="h-3.5 w-3.5" /> Ver histórico
        </Link>
      </div>
      {hasChildren && open && (
        <div>
          {node.children!.map(c => <TreeNode key={c.id} node={c} depth={depth + 1} />)}
        </div>
      )}
    </div>
  );
}

/* -------------------- Lista -------------------- */

function ListaView({ items, loading }: { items: Ativo[]; loading: boolean }) {
  const [q, setQ] = useState("");
  const [torre, setTorre] = useState("todas");
  const [tipo, setTipo] = useState("todos");
  const [status, setStatus] = useState("todos");

  const filtered = useMemo(() => items.filter(a => {
    if (torre !== "todas" && a.torre !== torre) return false;
    if (tipo !== "todos" && a.tipo !== tipo) return false;
    if (status !== "todos" && a.status_ativo !== status) return false;
    if (q.trim()) {
      const s = q.trim().toLowerCase();
      const hay = `${a.nome} ${a.categoria} ${a.torre ?? ""} ${a.local ?? ""}`.toLowerCase();
      if (!hay.includes(s)) return false;
    }
    return true;
  }), [items, q, torre, tipo, status]);

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4 grid gap-3 md:grid-cols-5">
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Buscar…" value={q} onChange={e => setQ(e.target.value)} />
          </div>
          <Select value={torre} onValueChange={setTorre}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas as torres</SelectItem>
              <SelectItem value="Geral">Geral</SelectItem>
              {TORRES.map(t => <SelectItem key={t.id} value={t.id}>{t.id} — {t.nome}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={tipo} onValueChange={setTipo}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os tipos</SelectItem>
              {TIPOS_ATIVO.map(t => <SelectItem key={t} value={t}>{TIPO_ATIVO_LABEL[t]}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os status</SelectItem>
              {STATUS_ATIVO.map(s => <SelectItem key={s} value={s}>{STATUS_ATIVO_LABEL[s]}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Torre / Local</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Última manutenção</TableHead>
                <TableHead>Próxima preventiva</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} className="p-0"><TableSkeleton rows={6} cols={5} /></TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="p-0">
                  <EmptyState
                    icon={Package}
                    title="Nenhum ativo cadastrado"
                    description="Cadastre equipamentos e locais para vinculá-los aos chamados."
                  />
                </TableCell></TableRow>
              ) : (
                filtered.map(a => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{a.nome}</TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px]">{TIPO_ATIVO_LABEL[a.tipo]}</Badge></TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {a.torre ?? "—"}{a.local && a.local !== a.torre ? ` · ${a.local}` : ""}
                    </TableCell>
                    <TableCell><StatusBadge status={a.status_ativo} /></TableCell>
                    <TableCell className="text-sm">{formatDate(a.ultima_manutencao)}</TableCell>
                    <TableCell className="text-sm">{formatDate(a.proxima_preventiva)}</TableCell>
                    <TableCell className="text-right">
                      <Link to="/ativos/$id" params={{ id: a.id }} className="text-primary text-sm hover:underline">
                        Detalhes
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

/* -------------------- Elevadores -------------------- */

function ElevadoresView({ items, loading }: { items: Ativo[]; loading: boolean }) {
  const elevadores = useMemo(() => items.filter(a => a.categoria === "Elevador"), [items]);
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    if (elevadores.length === 0) return;
    (async () => {
      const ids = elevadores.map(e => e.id);
      const { data, error } = await supabase
        .from("manutencoes")
        .select("ativo_id, status")
        .in("ativo_id", ids)
        .neq("status", "Concluído");
      if (error) {
        toast.error("Não foi possível carregar os chamados dos elevadores.");
        return;
      }
      const map: Record<string, number> = {};
      (data ?? []).forEach((m: { ativo_id: string | null }) => {
        if (!m.ativo_id) return;
        map[m.ativo_id] = (map[m.ativo_id] ?? 0) + 1;
      });
      setCounts(map);
    })();
  }, [elevadores]);

  if (loading) return <Card className="rounded-[var(--radius-card)] shadow-[var(--shadow-card)]"><CardContent className="p-2 md:p-4"><TreeSkeleton rows={6} /></CardContent></Card>;
  if (elevadores.length === 0) {
    return (
      <Card className="rounded-[var(--radius-card)] shadow-[var(--shadow-card)]">
        <CardContent className="p-0">
          <EmptyState
            icon={Package}
            title="Nenhum elevador cadastrado"
            description="Cadastre equipamentos e locais para vinculá-los aos chamados."
          />
        </CardContent>
      </Card>
    );
  }

  const porTorre = new Map<string, Ativo[]>();
  for (const e of elevadores) {
    const k = e.torre ?? "—";
    if (!porTorre.has(k)) porTorre.set(k, []);
    porTorre.get(k)!.push(e);
  }

  return (
    <div className="space-y-4">
      {Array.from(porTorre.entries()).sort(([a], [b]) => a.localeCompare(b, "pt-BR")).map(([torre, list]) => (
        <Card key={torre}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ArrowUpDown className="h-4 w-4 text-primary" />
              {torre}
              <Badge variant="secondary">{list.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {list.map(e => {
              const open = counts[e.id] ?? 0;
              return (
                <Link
                  key={e.id}
                  to="/ativos/$id"
                  params={{ id: e.id }}
                  className="rounded-xl border bg-card p-4 hover:border-primary/40 hover:shadow-sm transition space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-medium truncate">{e.nome}</div>
                      <div className="text-xs text-muted-foreground truncate">{e.torre}</div>
                    </div>
                    <StatusBadge status={e.status_ativo} />
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <div className="text-muted-foreground">Última</div>
                      <div>{formatDate(e.ultima_manutencao) || "—"}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Próxima</div>
                      <div>{formatDate(e.proxima_preventiva) || "—"}</div>
                    </div>
                  </div>
                  {e.empresa_responsavel && (
                    <div className="text-xs text-muted-foreground truncate">Empresa: {e.empresa_responsavel}</div>
                  )}
                  <div className={`text-xs font-medium ${open > 0 ? "text-amber-600" : "text-muted-foreground"}`}>
                    {open} chamado{open === 1 ? "" : "s"} em aberto
                  </div>
                </Link>
              );
            })}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/* -------------------- Novo ativo (modal) -------------------- */

function NovoAtivoDialog({
  open, onOpenChange, parents, onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  parents: Ativo[];
  onCreated: () => void;
}) {
  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState<string>("ativo");
  const [parentId, setParentId] = useState<string>("__none__");
  const [torre, setTorre] = useState<string>("Geral");
  const [categoria, setCategoria] = useState<string>(CATEGORIAS_ATIVO[0]);
  const [status, setStatus] = useState<string>("operacional");
  const [numeroSerie, setNumeroSerie] = useState("");
  const [fabricante, setFabricante] = useState("");
  const [modelo, setModelo] = useState("");
  const [garantia, setGarantia] = useState<string>("");
  const [obs, setObs] = useState("");
  const [saving, setSaving] = useState(false);

  function reset() {
    setNome(""); setTipo("ativo"); setParentId("__none__"); setTorre("Geral");
    setCategoria(CATEGORIAS_ATIVO[0]); setStatus("operacional");
    setNumeroSerie(""); setFabricante(""); setModelo(""); setGarantia(""); setObs("");
  }

  // Agrupar parents por torre para o Select hierárquico
  const parentsGroups = useMemo(() => {
    const locais = parents.filter(p => p.tipo === "local");
    const map = new Map<string, Ativo[]>();
    for (const p of locais) {
      const k = p.torre ?? "—";
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(p);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b, "pt-BR"));
  }, [parents]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim()) { toast.error("Informe o nome."); return; }
    setSaving(true);
    try {
      await createAtivo({
        nome: nome.trim(),
        tipo: tipo as Ativo["tipo"],
        parent_id: parentId === "__none__" ? null : parentId,
        torre,
        categoria,
        status_ativo: status as Ativo["status_ativo"],
        numero_serie: numeroSerie.trim() || null,
        fabricante: fabricante.trim() || null,
        modelo: modelo.trim() || null,
        garantia_ate: garantia || null,
        observacoes: obs.trim() || null,
      });
      toast.success("Ativo criado.");
      reset();
      onCreated();
    } catch (err) {
      toast.error("Não foi possível salvar. Tente novamente.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo ativo</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="md:col-span-2">
              <Label>Nome *</Label>
              <Input value={nome} onChange={e => setNome(e.target.value)} required />
            </div>
            <div>
              <Label>Tipo</Label>
              <Select value={tipo} onValueChange={setTipo}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TIPOS_ATIVO.map(t => <SelectItem key={t} value={t}>{TIPO_ATIVO_LABEL[t]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Torre / Local pai</Label>
              <Select value={parentId} onValueChange={setParentId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-72">
                  <SelectItem value="__none__">— Sem pai (raiz) —</SelectItem>
                  {parentsGroups.map(([g, list]) => (
                    <SelectGroup key={g}>
                      <SelectLabel>{g}</SelectLabel>
                      {list.map(p => (
                        <SelectItem key={p.id} value={p.id}>
                          {"— ".repeat(p.nivel)}{p.nome}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Torre</Label>
              <Select value={torre} onValueChange={setTorre}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Geral">Geral</SelectItem>
                  {TORRES.map(t => <SelectItem key={t.id} value={t.id}>{t.id} — {t.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Categoria</Label>
              <Select value={categoria} onValueChange={setCategoria}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIAS_ATIVO.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUS_ATIVO.map(s => <SelectItem key={s} value={s}>{STATUS_ATIVO_LABEL[s]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Nº série</Label>
              <Input value={numeroSerie} onChange={e => setNumeroSerie(e.target.value)} />
            </div>
            <div>
              <Label>Fabricante</Label>
              <Input value={fabricante} onChange={e => setFabricante(e.target.value)} />
            </div>
            <div>
              <Label>Modelo</Label>
              <Input value={modelo} onChange={e => setModelo(e.target.value)} />
            </div>
            <div>
              <Label>Garantia até</Label>
              <Input type="date" value={garantia} onChange={e => setGarantia(e.target.value)} />
            </div>
            <div className="md:col-span-2">
              <Label>Observações</Label>
              <Textarea value={obs} onChange={e => setObs(e.target.value)} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>{saving ? "Salvando…" : "Salvar"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
