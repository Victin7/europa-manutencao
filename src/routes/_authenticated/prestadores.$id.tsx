import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  getPrestador, statusInfo, listAvaliacoes, getPrestadorHistorico, deletePrestador,
} from "@/lib/prestadores";
import { SignedImage } from "@/components/SignedImage";
import { AvaliacaoStars } from "@/components/AvaliacaoStars";
import { Building2, Phone, MessageSquare, Mail, User, Pencil, Trash2, ArrowLeft, FileText } from "lucide-react";
import { formatDate, formatDateTime } from "@/lib/manutencoes";
import { useIsAdmin, useIsReadOnly } from "@/hooks/use-role";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/prestadores/$id")({ component: Page });

function Page() {
  const { id } = Route.useParams();
  const nav = useNavigate();
  const qc = useQueryClient();
  const isAdmin = useIsAdmin();
  const isReadOnly = useIsReadOnly();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { data: p, isLoading } = useQuery({ queryKey: ["prestador", id], queryFn: () => getPrestador(id) });
  const { data: hist } = useQuery({ queryKey: ["prestador-hist", id], queryFn: () => getPrestadorHistorico(id) });
  const { data: avaliacoes = [] } = useQuery({ queryKey: ["prestador-avals", id], queryFn: () => listAvaliacoes(id) });
  const { data: servicos = [] } = useQuery({
    queryKey: ["prestador-servicos", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("manutencoes")
        .select("id,numero_chamado,descricao,status,data_conclusao,created_at")
        .eq("prestador_id" as never, id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Array<{ id: string; numero_chamado: string; descricao: string; status: string; data_conclusao: string | null; created_at: string }>;
    },
  });

  if (isLoading || !p) return <p className="text-sm text-muted-foreground">Carregando…</p>;
  const s = statusInfo(p.status);

  async function excluir() {
    setConfirmDelete(false);
    try {
      await deletePrestador(id);
      toast.success("Empresa excluída com sucesso.");
      qc.invalidateQueries({ queryKey: ["prestadores"] });
      nav({ to: "/prestadores" });
    } catch (e) {
      toast.error("Erro ao excluir. Verifique sua conexão.");
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => nav({ to: "/prestadores" })}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
        </Button>
      </div>

      <Card className="p-6">
        <div className="flex flex-wrap items-start gap-4">
          <div className="h-20 w-20 rounded-md bg-muted grid place-items-center overflow-hidden shrink-0">
            {p.logo_path ? <SignedImage path={p.logo_path} className="h-20 w-20 object-cover" /> : <Building2 className="h-8 w-8 text-muted-foreground" />}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-display text-2xl font-bold text-primary">{p.nome_empresa}</h1>
            <div className="text-sm text-muted-foreground">{p.categoria}</div>
            <div className="mt-2">
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border bg-[color:var(--${s.color})]/15 text-[color:var(--${s.color})] border-[color:var(--${s.color})]/30`}>
                {s.emoji} {s.label}
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            {!isReadOnly && (
              <Button variant="outline" asChild>
                <Link to="/prestadores/$id/editar" params={{ id }}><Pencil className="h-4 w-4 mr-2" /> Editar</Link>
              </Button>
            )}
            {isAdmin && (
              <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive"><Trash2 className="h-4 w-4 mr-2" /> Excluir</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Excluir “{p.nome_empresa}”?</AlertDialogTitle>
                    <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={excluir}>Excluir</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>
      </Card>

      <div className="grid md:grid-cols-4 gap-3">
        <Kpi label="Serviços" value={hist?.totalServicos ?? 0} />
        <Kpi label="Avaliação média" value={hist?.avaliacaoMedia ? `${hist.avaliacaoMedia.toFixed(2)}★` : "—"} />
        <Kpi label="Tempo médio conclusão" value={hist?.tempoMedioConclusaoDias != null ? `${hist.tempoMedioConclusaoDias}d` : "—"} />
        <Kpi label="Último atendimento" value={formatDate(hist?.ultimoAtendimento ?? null)} />
      </div>

      <Tabs defaultValue="info" className="space-y-4">
        <TabsList>
          <TabsTrigger value="info">Informações</TabsTrigger>
          <TabsTrigger value="hist">Histórico ({servicos.length})</TabsTrigger>
          <TabsTrigger value="docs">Documentos ({p.documentos.length})</TabsTrigger>
          <TabsTrigger value="avals">Avaliações ({avaliacoes.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="info">
          <Card className="p-6 space-y-2 text-sm">
            {p.responsavel && <div className="flex items-center gap-2"><User className="h-4 w-4 text-muted-foreground" /> {p.responsavel}</div>}
            {p.cnpj && <div><span className="text-muted-foreground">CNPJ:</span> {p.cnpj}</div>}
            {p.telefone && <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground" /> {p.telefone}</div>}
            {p.whatsapp && <div className="flex items-center gap-2"><MessageSquare className="h-4 w-4 text-muted-foreground" /> {p.whatsapp}</div>}
            {p.email && <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-muted-foreground" /> {p.email}</div>}
            {p.observacoes && (
              <div className="pt-3 border-t">
                <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Observações</div>
                <p className="whitespace-pre-wrap">{p.observacoes}</p>
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="hist">
          <Card className="p-4">
            {servicos.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum serviço realizado ainda.</p>
            ) : (
              <ul className="divide-y">
                {servicos.map(sv => (
                  <li key={sv.id} className="py-2 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <Link to="/manutencoes/$id" params={{ id: sv.id }} className="font-medium text-primary hover:underline">
                        {sv.numero_chamado}
                      </Link>
                      <div className="text-xs text-muted-foreground truncate">{sv.descricao}</div>
                    </div>
                    <div className="text-xs text-muted-foreground text-right shrink-0">
                      <div>{sv.status}</div>
                      <div>{formatDate(sv.data_conclusao ?? sv.created_at)}</div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="docs">
          <Card className="p-4">
            {p.documentos.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum documento anexado.</p>
            ) : (
              <ul className="space-y-1">
                {p.documentos.map(d => (
                  <li key={d.path} className="flex items-center gap-2 text-sm">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <button
                      className="hover:underline"
                      onClick={async () => {
                        const { data } = await supabase.storage.from("manutencoes").createSignedUrl(d.path, 3600);
                        if (data?.signedUrl) window.open(data.signedUrl, "_blank");
                      }}
                    >
                      {d.name}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="avals">
          <Card className="p-4 space-y-3">
            {avaliacoes.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma avaliação ainda.</p>
            ) : avaliacoes.map(a => (
              <div key={a.id} className="border rounded-md p-3">
                <div className="flex items-center justify-between">
                  <AvaliacaoStars value={Number(a.nota_geral)} readOnly />
                  <span className="text-xs text-muted-foreground">{formatDateTime(a.created_at)}</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mt-2 text-xs text-muted-foreground">
                  <span>Qualidade: {a.qualidade}★</span>
                  <span>Organização: {a.organizacao}★</span>
                  <span>Prazo: {a.prazo}★</span>
                  <span>Atendimento: {a.atendimento}★</span>
                  <span>Limpeza: {a.limpeza}★</span>
                </div>
                {a.comentario && <p className="text-sm mt-2 italic">"{a.comentario}"</p>}
              </div>
            ))}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string | number }) {
  return (
    <Card className="p-3">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-lg font-semibold text-primary mt-1">{value}</div>
    </Card>
  );
}
